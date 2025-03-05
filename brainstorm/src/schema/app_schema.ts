/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { TreeViewConfiguration } from "fluid-framework";
import { Items } from "../components/items.js";

// Export the tree config appropriate for this schema.
// This is passed into the SharedTree when it is initialized.
export const appTreeConfiguration = new TreeViewConfiguration(
	// Schema for the root
	{ schema: Items },
);
