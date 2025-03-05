/* eslint-disable @typescript-eslint/no-unused-vars */
/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

// Include a UUID to guarantee that this schema will be uniquely identifiable.

import { SchemaFactory, Tree } from "fluid-framework";
import { Item, itemFields, ItemSchema, MyAppComponent } from "./itemAbstractions.js";
import { itemAllowedTypes, Items, ItemsView } from "./items.js";
import React, { JSX, useEffect, useState } from "react";
import { dragType } from "../utils/utils.js";
import { ConnectableElement, useDrag, useDrop } from "react-dnd";
import { moveItem } from "../utils/app_helpers.js";
import { DeleteButton } from "../react/buttonux.js";
import { Session } from "../schema/session_schema.js";
import { Note } from "./note.js";
import { Component } from "fluid-framework/alpha";

const sf = new SchemaFactory("d3872080-b9bd-4315-a210-0dda4fedcb18");

// Define the schema for the container of notes.
export class Group
	extends sf.object("Group", {
		...itemFields,
		name: sf.string,
		items: [() => Items],
	})
	implements Item
{
	public static readonly description = "Group";
	public static default(): Group {
		throw new Error("Not implemented");
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
		throw new Error("Not implemented");
	}

	/**
	 * Removes a group from its parent {@link Items}.
	 * If the note is not in an {@link Items}, it is left unchanged.
	 *
	 * Before removing the group, its children are move to the parent.
	 */
	public readonly delete = () => {
		const parent = Tree.parent(this);
		if (Tree.is(parent, Items)) {
			// Run the deletion as a transaction to ensure that the tree is in a consistent state
			Tree.runTransaction(parent, () => {
				// Move the children of the group to the parent
				if (this.items.length !== 0) {
					const index = parent.indexOf(this);
					parent.moveRangeToIndex(index, 0, this.items.length, this.items);
				}

				// Delete the now empty group
				const i = parent.indexOf(this);
				parent.removeAt(i);
			});
		}
	};
}

export function GroupView(props: {
	group: Group;
	clientId: string;
	session: Session;
	fluidMembers: string[];
}): JSX.Element {
	// copy the array of items from the group
	// to force a re-render when the array changes
	const [itemsArray, setItemsArray] = useState<Item[]>(props.group.items.map((item) => item));
	const [name, setName] = useState(props.group.name);

	// Register for tree deltas when the component mounts.
	// Any time the items array changes, the app will update
	// Note, we are only listening to changes to the array
	// not the items within the array. Those changes are
	// handled by the NoteView component.
	useEffect(() => {
		const unsubscribe = Tree.on(props.group.items, "nodeChanged", () => {
			setItemsArray(props.group.items.map((item) => item));
		});
		return unsubscribe;
	}, []);

	// Register for tree deltas when the component mounts.
	// Any time the group changes, the app will update
	useEffect(() => {
		const unsubscribe = Tree.on(props.group, "nodeChanged", () => {
			setName(props.group.name);
		});
		return unsubscribe;
	}, []);

	const parent = Tree.parent(props.group);
	if (!Tree.is(parent, Items)) {
		return <></>;
	}

	const [, drag] = useDrag(() => ({
		type: dragType.GROUP,
		item: props.group,
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
		canDrop: (item) => Tree.is(item, itemAllowedTypes) && !Tree.contains(item, parent),
		drop: (item, monitor) => {
			const didDrop = monitor.didDrop();
			if (didDrop) {
				return;
			}

			const isOver = monitor.isOver({ shallow: true });
			if (!isOver) {
				return;
			}

			if (Tree.is(item, Group) || Tree.is(item, Note)) {
				moveItem(item, parent.indexOf(props.group), parent);
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
						props.group.name = name;
					}}
					deletePile={props.group.delete}
				/>
				<ItemsView
					items={itemsArray}
					parent={props.group.items}
					clientId={props.clientId}
					session={props.session}
					fluidMembers={props.fluidMembers}
				/>
			</div>
		</div>
	);
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

export const groupComponent: MyAppComponent = {
	itemTypes(): Component.LazyArray<ItemSchema> {
		return [() => Group];
	},
};
