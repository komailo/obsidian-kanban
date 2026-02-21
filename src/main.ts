import { Plugin, WorkspaceLeaf, TFile } from 'obsidian';
import { KanbanView, KANBAN_VIEW_TYPE } from './view';
import { DEFAULT_SETTINGS, KanbanSettings, KanbanSettingTab } from './settings';

export default class KanbanPlugin extends Plugin {
    settings: KanbanSettings;

    async onload() {
        await this.loadSettings();

        this.registerView(
            KANBAN_VIEW_TYPE,
            (leaf) => new KanbanView(leaf)
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
        const content = "# New Board\n\n## Todo\n\n## Done\n";
        
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
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<KanbanSettings>);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
