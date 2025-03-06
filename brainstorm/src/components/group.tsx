/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { SchemaFactory, Tree } from "fluid-framework";
import { Item, itemFields, ItemSchema, MyAppComponent } from "./itemAbstractions.js";
import { itemAllowedTypes, Items } from "./items.js";
import React, { JSX, useEffect, useState } from "react";
import { dragType } from "../utils/utils.js";
import { ConnectableElement, useDrag, useDrop } from "react-dnd";
import { findItem, moveItem } from "../utils/app_helpers.js";
import { DeleteButton } from "../react/buttonux.js";
import { Session } from "../schema/session_schema.js";
import { Component, TreeAlpha } from "fluid-framework/alpha";
import { getSelectedItems } from "../utils/session_helpers.js";
import { RectangleLandscapeRegular } from "@fluentui/react-icons";

// Include a UUID to guarantee that this schema will be uniquely identifiable.
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
	public children(): Iterable<Item> {
		return this.items;
	}
	public static readonly description = "Group";
	public static readonly icon = (<RectangleLandscapeRegular />);
	public static default(author: string, name = "[new group]"): Group {
		return new Group({
			name,
			items: new Items([]),
		});
	}

	public postInsertNew(session: Session, clientId: string): void {
		// Move selected items into this group

		// Look for selected items within root Items subtree.
		// TODO: consider making findItem more generic to allow searching subtrees with unknown schema.
		const branch = TreeAlpha.branch(this);
		if (!branch?.hasRootSchema(Items)) {
			return;
		}

		const ids = getSelectedItems(session, clientId);
		for (const id of ids) {
			const n = findItem(branch.root, id);
			if (Tree.is(n, itemAllowedTypes)) {
				moveItem(n, Infinity, this.items);
			}
		}
	}

	public deleted(oldParent: Items, oldIndex: number): void {
		// Move the children of the group to the parent
		if (this.items.length !== 0) {
			oldParent.moveRangeToIndex(oldIndex, 0, this.items.length, this.items);
		}
	}

	public readonly View = (props: {
		clientId: string;
		session: Session;
		fluidMembers: string[];
	}): JSX.Element => {
		return <GroupView group={this} {...props} />;
	};

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
	const [name, setName] = useState(props.group.name);

	// Register for tree changes when the component mounts.
	// Any time the group changes, the app will update
	useEffect(() => {
		const unsubscribe = Tree.on(props.group, "nodeChanged", () => {
			setName(props.group.name);
		});
		return unsubscribe;
	}, []);

	const [items, setItems] = useState(props.group.items);
	useEffect(() => {
		const unsubscribe = Tree.on(props.group, "nodeChanged", () => {
			setItems(props.group.items);
		});
		return unsubscribe;
	}, []);

	const [parent, setParent] = useState(Tree.parent(props.group));
	useEffect(() => {
		const oldParent = Tree.parent(props.group);
		if (oldParent === undefined) {
			const branch = TreeAlpha.branch(props.group);
			if (branch === undefined) {
				// TODO: make invalidation in this case possible. Maybe a parent change event that is robust?
				throw new Error(
					"Cannot view group that is the root of an un-hydrated tree since there is no API to do invalidation for it currently",
				);
			} else {
				// TODO: make invalidation in this case possible. Maybe a parent change event that is robust?
				throw new Error(
					"Cannot view group that is the root of a hydrated tree since TreeBranchEvents doesn't extend TreeViewEvents so no access to rootChanged event",
				);
			}
		}
		const unsubscribe = Tree.on(oldParent, "nodeChanged", () => {
			setParent(Tree.parent(props.group));
		});
		return unsubscribe;
	}, []);

	// TODO: use ItemParent here instead of Items.
	if (!Tree.is(parent, Items)) {
		// TODO: decide how drag and drop should handle this case instead of no-op the whole view
		return <></>;
	}

	const [, drag] = useDrag(() => ({
		type: dragType.ITEM,
		item: props.group,
		collect: (monitor) => ({
			isDragging: monitor.isDragging(),
		}),
	}));

	const [{ isOver, canDrop }, drop] = useDrop(() => ({
		accept: [dragType.ITEM],
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

			if (Tree.is(item, itemAllowedTypes)) {
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

	const ItemsView = items.View;

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
