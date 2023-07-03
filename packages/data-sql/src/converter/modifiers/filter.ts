import type { AbstractQueryFieldNodeFn, AbstractQueryFilterNode } from '@directus/data';
import type { AbstractSqlQuery } from '../types.js';
import type { AbstractSqlQueryFnNode, SqlStatementColumn } from '../types.js';

/**
 * Extracts the filer values and replaces it with parameter indexes.
 *
 * @param filter - all filter conditions
 * @param collection - the name of the collection
 * @param firstParameterIndex - The index of the parameter. Mandatory for all operators.
 * @param secondParameterIndex - The index of an additional parameter. Only needed for some operators like BETWEEN.
 * @returns
 */
export const convertFilter = (
	filter: AbstractQueryFilterNode,
	collection: string,
	generator: Generator<number, never, never>
): Required<Pick<AbstractSqlQuery, 'where' | 'parameters'>> => {
	return convertFilterWithNegate(filter, collection, generator, false);
};

const convertFilterWithNegate = (
	filter: AbstractQueryFilterNode,
	collection: string,
	generator: Generator<number, never, never>,
	negate: boolean
): Required<Pick<AbstractSqlQuery, 'where' | 'parameters'>> => {
	if (filter.type === 'condition') {
		if (filter.operation === 'intersects' || filter.operation === 'intersects_bounding_box') {
			/** @todo */
			throw new Error('The intersects operators are not yet supported.');
		}

		let target: AbstractSqlQueryFnNode | SqlStatementColumn;
		const parameters = [];

		if (filter.target.type === 'primitive') {
			target = {
				type: 'primitive',
				table: collection,
				column: filter.target.field,
			};
		} else if (filter.target.type === 'fn') {
			const convertedFn = convertFn(collection, filter.target, generator);
			target = convertedFn.fn;
			parameters.push(...convertedFn.parameters);
		} else {
			throw new Error('The related field types are not yet supported.');
		}

		return {
			where: {
				type: 'condition',
				negate,
				operation: filter.operation,
				target,
				compareTo: {
					type: 'value',
					parameterIndexes: [generator.next().value],
				},
			},
			parameters: [...parameters, filter.compareTo.value],
		};
	} else if (filter.type === 'negate') {
		return convertFilterWithNegate(filter.childNode, collection, generator, !negate);
	} else {
		const children = filter.childNodes.map((childNode) =>
			convertFilterWithNegate(childNode, collection, generator, false)
		);

		return {
			where: {
				type: 'logical',
				negate,
				operator: filter.operator,
				childNodes: children.map((child) => child.where),
			},
			parameters: children.flatMap((child) => child.parameters),
		};
	}
};

/**
 * @param collection
 * @param abstractFunction
 * @param idxGenerator
 */
export function convertFn(
	collection: string,
	abstractFunction: AbstractQueryFieldNodeFn,
	idxGenerator: Generator
): { fn: AbstractSqlQueryFnNode; parameters: (string | number | boolean)[] } {
	if (abstractFunction.targetNode.type !== 'primitive') {
		throw new Error('Nested functions are not yet supported.');
	}

	const fn: AbstractSqlQueryFnNode = {
		type: 'fn',
		fn: abstractFunction.fn,
		table: collection,
		column: abstractFunction.targetNode.field,
		parameterIndexes: [],
	};

	if (abstractFunction.args && abstractFunction.args?.length > 0) {
		fn.parameterIndexes = abstractFunction.args.map(() => idxGenerator.next().value);
	}

	return {
		fn,
		parameters: abstractFunction.args?.map((arg) => arg) ?? [],
	};
}