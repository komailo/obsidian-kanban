# Obsidian Kanban Plugin

## Purpose
This repository is dedicated to the development of a modern, feature-rich Kanban plugin for Obsidian. The goal is to provide a seamless, markdown-backed Kanban experience that integrates deeply with Obsidian's ecosystem, allowing users to manage tasks and projects directly within their vaults.

## Project Overview
This project is being built from the ground up following the standard Obsidian plugin architecture as demonstrated in the official [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin).

- **Primary Technologies**: TypeScript, Obsidian API, esbuild.
- **Key Files**: `main.ts`, `manifest.json`, `styles.css`.

## Development Strategy
The project structure and build process will strictly follow the official sample plugin. The initial focus will be:
1. Scaffolding the project using the structure and configurations (`package.json`, `tsconfig.json`, `esbuild.config.mjs`) from the sample plugin.
2. Implementing the core plugin lifecycle in `main.ts`.
3. Designing the Markdown-to-Kanban parsing logic.

## Development Goals
1. **Markdown-Backed**: Ensure all board data is stored in standard Markdown files.
2. **Interactive UI**: Build a responsive and intuitive drag-and-drop interface.
3. **Deep Integration**: Support Obsidian-native features like links, tags, and dataview-style queries.
4. **Customizability**: Allow users to define their own board layouts and styles.

## Building and Running (Standard)
- `npm install`: Install dependencies.
- `npm run dev`: Build the plugin in development mode with watch functionality.
- `npm run build`: Production build.

## Development Conventions
- **Surgical Updates**: Always use the `replace` tool for precise code modifications.
- **Verification**: Ensure all changes are validated against the Obsidian API standards and sample implementation.
- **Type Safety**: Maintain strict TypeScript typing across the codebase.

## References
- **Obsidian Sample Plugin**: [https://github.com/obsidianmd/obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- **Obsidian Developer Documentation**: [https://docs.obsidian.md/](https://docs.obsidian.md/)
- **Obsidian API Definitions**: [https://github.com/obsidianmd/obsidian-api](https://github.com/obsidianmd/obsidian-api)
- **Plugin Developer Docs**: [https://github.com/obsidianmd/obsidian-developer-docs/tree/main/en/Plugins](https://github.com/obsidianmd/obsidian-developer-docs/tree/main/en/Plugins)
