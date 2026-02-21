import { Plugin, WorkspaceLeaf, TFile } from 'obsidian';
import { KanbanView, KANBAN_VIEW_TYPE } from './view';
import { MarkdownParser } from './parser';
import { DEFAULT_SETTINGS, KanbanSettings, KanbanSettingTab } from './settings';

export default class KanbanPlugin extends Plugin {
    settings: KanbanSettings;

    async onload() {
        await this.loadSettings();

        this.registerView(
            KANBAN_VIEW_TYPE,
            (leaf) => new KanbanView(leaf, this)
        );

        this.registerExtensions(['kanban'], KANBAN_VIEW_TYPE);

        this.addRibbonIcon('dice', 'New Kanban Board', async () => {
            await this.createNewBoard();
        });

        this.addCommand({
            id: 'open-kanban-view',
            name: 'Open Kanban View',
            callback: () => {
                this.activateView();
            }
        });

        this.addCommand({
            id: 'create-new-kanban-board',
            name: 'Create New Kanban Board',
            callback: async () => {
                await this.createNewBoard();
            }
        });

        this.addSettingTab(new KanbanSettingTab(this.app, this));
    }

    onunload() {
        // Workspace handles detaching leaves for us usually, but we can be explicit
    }

    async createNewBoard() {
        const { vault, workspace } = this.app;

        // Create a new file with .kanban extension
        const fileName = `Untitled Kanban ${Date.now()}.kanban`;
        const content = "# New Board\n\n## Backlog\n\n## Todo\n\n## In Progress\n\n## Done\n";

        const file = await vault.create(fileName, content);

        // Open the file
        const leaf = workspace.getLeaf(true);
        await leaf.openFile(file);
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

## Backlog

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
