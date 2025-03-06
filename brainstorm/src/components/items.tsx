/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import {
	Component,
	customizeSchemaTyping,
	evaluateLazySchema,
	NodeFromSchema,
	SchemaFactory,
	Tree,
	TreeNode,
	TreeStatus,
} from "fluid-framework/alpha";
import { Session } from "../schema/session_schema.js";
import React, { JSX, useEffect, useState } from "react";
import { Item, ItemSchema } from "./itemAbstractions.js";

const sf = new SchemaFactory("d0e4467e-71fe-4951-a218-2f48eab646fb");

export const ItemParentSymbol = Symbol("ItemParent");

export function makeItems(itemTypes: Component.LazyArray<ItemSchema>) {
	// Schema for a list of Notes and Groups.
	return class Items extends sf.array(
		"Items",
		customizeSchemaTyping(itemTypes).simplifiedUnrestricted<Item>(),
	) {
		public get [ItemParentSymbol](): ItemParent {
			// eslint-disable-next-line @typescript-eslint/no-this-alias
			const parentArray = this;
			return {
				deleteItem(item: Item): void {
					const index = parentArray.indexOf(item);
					parentArray.removeAt(index);
				},
				tryStealItem(item: Item, placeBefore?: Item): void {
					// need to test that the destination or the item being dragged hasn't been deleted
					// because the move may have been initiated through a drag and drop which
					// is asynchronous - the state may have changed during the drag but this function
					// is operating based on the state at the moment the drag began
					if (
						Tree.status(parentArray) != TreeStatus.InDocument ||
						Tree.status(item) != TreeStatus.InDocument
					)
						return;

					const source = Tree.parent(item);
					if (Tree.contains(item, parentArray)) {
						// Move would create a cycle: a item can't be moved under itself.
						return;
					}
					if (!Tree.is(source, Items)) {
						// Currently this code only supports moving items from another Items.
						// TODO: Once SharedTree supports inserting removed items into arrays,
						// tryStealItem could be split into a call to deleteItem and a call to insert which would fix this limitation.
						return;
					}
					if (!Tree.is(item, itemTypes)) {
						// Invalid input
						return;
					}

					const index = source.indexOf(item);

					if (placeBefore === undefined) {
						parentArray.moveToEnd(index, source);
					} else {
						const destinationIndex = parentArray.indexOf(placeBefore);
						parentArray.moveToIndex(destinationIndex, index, source);
					}
				},
			};
		}

		public readonly View = (props: {
			clientId: string;
			session: Session;
			fluidMembers: string[];
		}): JSX.Element => {
			// copy the array of items from the group
			// to force a re-render when the array changes
			const [itemsArray, setItemsArray] = useState<Item[]>(this.map((item) => item));
			// Register for tree deltas when the component mounts.
			// Any time the items array changes, the app will update
			// Note, we are only listening to changes to the array
			// not the items within the array. Those changes are
			// handled by the NoteView component.
			useEffect(() => {
				const unsubscribe = Tree.on(this, "nodeChanged", () => {
					setItemsArray(this.map((item) => item));
				});
				return unsubscribe;
			}, []);

			// TODO: remove this or add inval for it
			const isRoot = Tree.parent(this) === undefined;

			const pilesArray: JSX.Element[] = [];
			for (const i of itemsArray) {
				const View = i.View;
				pilesArray.push(
					<View
						key={i.id}
						clientId={props.clientId}
						session={props.session}
						fluidMembers={props.fluidMembers}
					/>,
				);
			}

			if (isRoot) {
				return (
					<div className="flex grow-0 flex-row h-full w-full flex-wrap gap-4 p-4 content-start overflow-y-scroll">
						{pilesArray}
						<div className="flex w-full h-24"></div>
					</div>
				);
			} else {
				const kinds = itemTypes.map(evaluateLazySchema);
				for (const kind of kinds) {
					if (kind.AddButton !== undefined) {
						// TODO: use key?
						// const key = `new${kind.description}`;
						pilesArray.push(<kind.AddButton target={this} clientId={props.clientId} />);
					}
				}

				return <div className="flex flex-row flex-wrap gap-8 p-2">{pilesArray}</div>;
			}
		};
	};
}

export type Items = NodeFromSchema<ReturnType<typeof makeItems>>;

export interface ItemParent {
	/**
	 * Removes a child Item.
	 */
	deleteItem(item: Item): void;

	/**
	 * Adds a child Item.
	 */
	tryStealItem(item: Item, placeBefore?: Item): void;
}

interface HasItemParent extends TreeNode {
	readonly [ItemParentSymbol]: ItemParent;
}

export function tryAsItemParent(node: TreeNode | undefined): ItemParent | undefined {
	return (node as HasItemParent)?.[ItemParentSymbol];
}

export function removeItemFromParent(item: Item): void {
	const parent = Tree.parent(item);

	if (parent !== undefined) {
		const itemParent = tryAsItemParent(parent);

		// Only remove if this item lives under a container
		if (itemParent !== undefined) {
			itemParent.deleteItem(item);
		}
	}
}

export function canDropItem(item: Item, target: TreeNode | undefined): boolean {
	return target !== undefined && !Tree.contains(item, target);
}
