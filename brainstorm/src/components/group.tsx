/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

// Include a UUID to guarantee that this schema will be uniquely identifiable.

import { SchemaFactory, Tree } from "fluid-framework";
import {
	deleteItem,
	Item,
	itemFields,
	Items,
	ItemSchema,
	ItemsView,
	MyAppComponent,
	MyAppConfigPartial,
} from "./items.js";
import React, { JSX, useEffect, useState } from "react";
import { dragType } from "../utils/utils.js";
import { ConnectableElement, useDrag, useDrop } from "react-dnd";
import { moveItem } from "../utils/app_helpers.js";
import { DeleteButton } from "../react/buttonux.js";
import { Session } from "../schema/session_schema.js";
import { Component } from "fluid-framework/alpha";

// As this schema uses a recursive type, the beta SchemaFactoryRecursive is used instead of just SchemaFactory.
const sf = new SchemaFactory("d3872080-b9bd-4315-a210-0dda4fedcb18");

// An example component which references schema from the configuration and can be recursive through it.
export const groupComponent: MyAppComponent = {
	itemTypes: (lazyConfig: () => MyAppConfigPartial): Component.LazyArray<ItemSchema> => [
		() => createContainer(lazyConfig()),
	],
};
function createContainer(config: MyAppConfigPartial): ItemSchema {
	class Group
		extends sf.object("Group", {
			...itemFields,
			name: sf.string,
			items: config.Items,
		})
		implements Item
	{
		public static readonly description = "Group";
		public static default(): Group {
			return new Group({ items: [], name: "New Group" });
		}

		public static AddButton(props: { target: Items; clientId: string }): JSX.Element {
			// TODO: A button to add a new group
			return <div></div>;
		}

		public deleted(oldParent: Items, oldIndex: number): void {
			// Move the children of the group to the parent
			if (this.items.length !== 0) {
				oldParent.moveRangeToIndex(oldIndex, 0, this.items.length, this.items);
			}
		}

		public View(props: {
			clientId: string;
			session: Session;
			fluidMembers: string[];
		}): JSX.Element {
			// copy the array of items from the group
			// to force a re-render when the array changes
			const [itemsArray, setItemsArray] = useState<Item[]>(this.items.map((item) => item));
			const [name, setName] = useState(this.name);

			// Register for tree deltas when the component mounts.
			// Any time the items array changes, the app will update
			// Note, we are only listening to changes to the array
			// not the items within the array. Those changes are
			// handled by the NoteView component.
			useEffect(() => {
				const unsubscribe = Tree.on(this.items, "nodeChanged", () => {
					setItemsArray(this.items.map((item) => item));
				});
				return unsubscribe;
			}, []);

			// Register for tree deltas when the component mounts.
			// Any time the group changes, the app will update
			useEffect(() => {
				const unsubscribe = Tree.on(this, "nodeChanged", () => {
					setName(this.name);
				});
				return unsubscribe;
			}, []);

			const parent = Tree.parent(this);
			if (!Tree.is(parent, config.Items)) {
				return <></>;
			}

			const [, drag] = useDrag(() => ({
				type: dragType.GROUP,
				item: this,
				collect: (monitor) => ({
					isDragging: monitor.isDragging(),
				}),
			}));

			const [{ isOver, canDrop }, drop] = useDrop(() => ({
				accept: [dragType.NOTE, dragType.GROUP],
				collect: (monitor) => ({
					isOver: !!monitor.isOver({ shallow: true }),
					canDrop: !!monitor.canDrop(),
				}),
				canDrop: (item) => {
					if (Tree.is(item, config.allowedItemTypes) && !Tree.contains(item, parent))
						return true;
					return false;
				},
				drop: (item, monitor) => {
					const didDrop = monitor.didDrop();
					if (didDrop) {
						return;
					}

					const isOver = monitor.isOver({ shallow: true });
					if (!isOver) {
						return;
					}

					if (Tree.is(item, config.allowedItemTypes)) {
						moveItem(item, parent.indexOf(this), parent);
					}

					return;
				},
			}));

			function attachRef(el: ConnectableElement) {
				drag(el);
				drop(el);
			}

			const handleClick = (e: React.MouseEvent) => {
				e.stopPropagation();
			};

			return (
				<div
					onClick={(e) => handleClick(e)}
					ref={attachRef}
					className={
						"transition-all border-l-4 border-dashed " +
						(isOver && canDrop ? "border-gray-500" : "border-transparent")
					}
				>
					<div
						className={
							"p-2 bg-gray-200 min-h-64 transition-all " +
							(isOver && canDrop ? "translate-x-3" : "")
						}
						aria-label="Note Group"
					>
						<GroupToolbar
							name={name}
							changeName={(name: string) => {
								this.name = name;
							}}
							deletePile={() => deleteItem(this, config)}
						/>
						<ItemsView
							config={config}
							items={itemsArray}
							parent={this.items}
							clientId={props.clientId}
							session={props.session}
							fluidMembers={props.fluidMembers}
						/>
					</div>
				</div>
			);
		}
	}

	return Group;
}

function GroupName(props: { name: string; changeName: (name: string) => void }): JSX.Element {
	return (
		<input
			className="flex w-0 grow p-1 mb-2 mr-2 text-lg font-bold text-black bg-transparent"
			type="text"
			value={props.name}
			onChange={(event) => props.changeName(event.target.value)}
		/>
	);
}

function GroupToolbar(props: {
	name: string;
	changeName: (name: string) => void;
	deletePile: () => void;
}): JSX.Element {
	return (
		<div className="flex flex-row justify-between">
			<GroupName {...props} />
			<DeletePileButton {...props} />
		</div>
	);
}

export function DeletePileButton(props: { deletePile: () => void }): JSX.Element {
	return <DeleteButton handleClick={() => props.deletePile()}></DeleteButton>;
}
