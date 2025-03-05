/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { SchemaFactory, Tree, ValidateRecursiveSchema } from "fluid-framework";
import { Session } from "../schema/session_schema.js";
import { Group, GroupView } from "./group.js";
import { AddNoteButton, Note, NoteView, RootNoteWrapper } from "./note.js";
import React, { JSX } from "react";
import { v4 as uuid } from "uuid";

// As this schema uses a recursive type, the beta SchemaFactoryRecursive is used instead of just SchemaFactory.
const sf = new SchemaFactory("d0e4467e-71fe-4951-a218-2f48eab646fb");

// Schema for a list of Notes and Groups.
export class Items extends sf.arrayRecursive("Items", [() => Group, Note]) {
	public readonly addNode = (author: string) => {
		const timeStamp = new Date().getTime();

		// Define the note to add to the SharedTree - this must conform to
		// the schema definition of a note
		const newNote = new Note({
			id: uuid(),
			text: "",
			author,
			votes: [],
			created: timeStamp,
			lastChanged: timeStamp,
		});

		// Insert the note into the SharedTree.
		this.insertAtEnd(newNote);
	};

	/**
	 * Add a new group (container for notes) to the SharedTree.
	 */
	public readonly addGroup = (name: string): Group => {
		const group = new Group({
			id: uuid(),
			name,
			items: new Items([]),
		});

		this.insertAtEnd(group);
		return group;
	};
}

{
	// Due to limitations of TypeScript, recursive schema may not produce type errors when declared incorrectly.
	// Using ValidateRecursiveSchema helps ensure that mistakes made in the definition of a recursive schema (like `Items`)
	// will introduce a compile error.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	type _check = ValidateRecursiveSchema<typeof Items>;
}

export function ItemsView(props: {
	items: (Note | Group)[];
	parent: Items;
	clientId: string;
	session: Session;
	fluidMembers: string[];
}): JSX.Element {
	const isRoot = Tree.parent(props.parent) === undefined;

	const pilesArray = [];
	for (const i of props.items) {
		if (Tree.is(i, Group)) {
			pilesArray.push(
				<GroupView
					key={i.id}
					group={i}
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
				pilesArray.push(
					<NoteView
						key={i.id}
						note={i}
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
		pilesArray.push(
			<AddNoteButton key="newNote" target={props.parent} clientId={props.clientId} />,
		);
		return <div className="flex flex-row flex-wrap gap-8 p-2">{pilesArray}</div>;
	}
}
