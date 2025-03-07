/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { Items } from "../schema/app_schema.js";
import { Item } from "../components/itemAbstractions.js";

export function findItem(items: Items, id: string): Item | undefined {
	for (const i of items) {
		const n = findItemInItem(i, id);
		if (n !== undefined) {
			return n;
		}
	}
	return undefined;
}

function findItemInItem(item: Item, id: string): Item | undefined {
	if (item.id === id) return item;

	for (const i of item.children()) {
		const n = findItemInItem(i, id);
		if (n !== undefined) {
			return n;
		}
	}

	return undefined;
}
