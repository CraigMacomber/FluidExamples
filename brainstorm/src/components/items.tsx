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
} from "fluid-framework/alpha";
import { Session } from "../schema/session_schema.js";
import { Group } from "./group.js";
import { Note } from "./note.js";
import React, { JSX, useEffect, useState } from "react";
import { Item, ItemSchema } from "./itemAbstractions.js";

const sf = new SchemaFactory("d0e4467e-71fe-4951-a218-2f48eab646fb");

function makeItems(items: Component.LazyArray<ItemSchema>) {
	// Schema for a list of Notes and Groups.
	return class Items extends sf.array(
		"Items",
		customizeSchemaTyping(items).simplifiedUnrestricted<Item>(),
	) {
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
				const kinds = itemAllowedTypes.map(evaluateLazySchema);
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

// Below here in this file, there are dependencies on the concrete set of Item types.

export const itemAllowedTypes: Component.LazyArray<ItemSchema> = [() => Group, () => Note];

export const Items = makeItems(itemAllowedTypes);

/**
 * Removes a node from its parent {@link Items}.
 * If the note is not in an {@link Items}, it is left unchanged.
 */
export function deleteItem(item: Item): void {
	const parent = Tree.parent(item);
	// Use type narrowing to ensure that parent is Items as expected for an Item.
	// TODO: introduce a way to do this without requiring a runtime reference to Items.
	if (Tree.is(parent, Items)) {
		const index = parent.indexOf(item);
		parent.removeAt(index);
	}
}
