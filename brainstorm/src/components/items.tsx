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
import { Note, RootNoteWrapper } from "./note.js";
import React, { JSX } from "react";
import { Item, ItemSchema } from "./itemAbstractions.js";

const sf = new SchemaFactory("d0e4467e-71fe-4951-a218-2f48eab646fb");

function makeItems(items: Component.LazyArray<ItemSchema>) {
	// Schema for a list of Notes and Groups.
	return class Items extends sf.array(
		"Items",
		customizeSchemaTyping(items).simplifiedUnrestricted<Item>(),
	) {};
}

export type Items = NodeFromSchema<ReturnType<typeof makeItems>>;

// Below here in this file, there are dependencies on the concrete set of Item types.

export const itemAllowedTypes: Component.LazyArray<ItemSchema> = [() => Group, () => Note];

export const Items = makeItems(itemAllowedTypes);

export function ItemsView(props: {
	items: Item[];
	parent: Items;
	clientId: string;
	session: Session;
	fluidMembers: string[];
}): JSX.Element {
	const isRoot = Tree.parent(props.parent) === undefined;

	const pilesArray: JSX.Element[] = [];
	for (const i of props.items) {
		// TODO: instead of explicitly handling each item type here, this should use the Item interface's View method
		if (Tree.is(i, Group)) {
			const View = i.View;
			pilesArray.push(
				<View
					schema={i}
					clientId={props.clientId}
					session={props.session}
					fluidMembers={props.fluidMembers}
				/>,
			);
		} else if (Tree.is(i, Note)) {
			if (isRoot) {
				pilesArray.push(
					<RootNoteWrapper
						key={i.id}
						note={i}
						clientId={props.clientId}
						session={props.session}
						fluidMembers={props.fluidMembers}
					/>,
				);
			} else {
				// NoteView
				const View = i.View;
				pilesArray.push(
					<View
						schema={i}
						clientId={props.clientId}
						session={props.session}
						fluidMembers={props.fluidMembers}
					/>,
				);
			}
		}
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
				pilesArray.push(<kind.AddButton target={props.parent} clientId={props.clientId} />);
			}
		}

		return <div className="flex flex-row flex-wrap gap-8 p-2">{pilesArray}</div>;
	}
}
