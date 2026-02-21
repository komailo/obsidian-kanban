import { App, Editor, MarkdownView, Modal, Notice, Plugin, WorkspaceLeaf } from 'obsidian';
import { KanbanView, KANBAN_VIEW_TYPE } from './view';
import { MarkdownParser } from './parser';
import { DEFAULT_SETTINGS, KanbanSettings, KanbanSettingTab } from './settings';

export default class KanbanPlugin extends Plugin {
    settings: KanbanSettings;

    async onload() {
        await this.loadSettings();

        this.registerView(
            KANBAN_VIEW_TYPE,
            (leaf) => new KanbanView(leaf)
        );

        this.addRibbonIcon('dice', 'Open Kanban Board', () => {
            this.activateView();
        });

        this.addCommand({
            id: 'open-kanban-view',
            name: 'Open Kanban View',
            callback: () => {
                this.activateView();
            }
        });

        this.addSettingTab(new KanbanSettingTab(this.app, this));
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(KANBAN_VIEW_TYPE);
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null | undefined = null;
        const leaves = workspace.getLeavesOfType(KANBAN_VIEW_TYPE);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            const rightLeaf = workspace.getRightLeaf(false);
            if (rightLeaf) {
                leaf = rightLeaf;
                await leaf.setViewState({ type: KANBAN_VIEW_TYPE, active: true });
            }
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
            
            // For now, let's load some sample data if the view is empty
            const view = leaf.view as KanbanView;
            if (view && !view.board) {
                const sampleMarkdown = `
# My Project Board

## Todo
- [ ] Task 1
- [ ] Task 2

## In Progress
- [ ] Task 3 (in progress)

## Done
- [x] Task 4
`;
                const board = MarkdownParser.parse(sampleMarkdown);
                view.setBoard(board);
            }
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<KanbanSettings>);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
