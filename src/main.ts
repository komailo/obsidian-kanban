import { Plugin, WorkspaceLeaf, TFile, normalizePath } from 'obsidian';
import { KanbanView, KANBAN_VIEW_TYPE } from './view';
import { DEFAULT_SETTINGS, KanbanSettings, KanbanSettingTab } from './settings';
import { CreateBoardModal } from './CreateBoardModal';

export default class KanbanPlugin extends Plugin {
    settings: KanbanSettings;

    async onload() {
        await this.loadSettings();

        this.registerView(
            KANBAN_VIEW_TYPE,
            (leaf) => new KanbanView(leaf, this)
        );

        this.registerExtensions(['kanban'], KANBAN_VIEW_TYPE);

        this.addRibbonIcon('dice', 'New board', () => {
            this.createNewBoard();
        });

        this.addCommand({
            id: 'open-view',
            name: 'Open board',
            callback: () => {
                this.activateView();
            }
        });

        this.addCommand({
            id: 'create-board',
            name: 'Create new board',
            callback: () => {
                this.createNewBoard();
            }
        });

        this.addSettingTab(new KanbanSettingTab(this.app, this));
    }

    onunload() {
    }

    createNewBoard() {
        const { vault, workspace } = this.app;

        new CreateBoardModal(this.app, async (boardName: string, createFolder: boolean) => {
            if (!boardName) boardName = 'Untitled kanban';

            let folderPath = '';
            let fileName = normalizePath(`${boardName}.kanban`);

            if (createFolder) {
                // Check if folder exists, if not, create it
                const folderExists = vault.getAbstractFileByPath(boardName);
                if (!folderExists) {
                    await vault.createFolder(boardName);
                }
                folderPath = boardName;
                // Use the board name for the file as well, just inside the folder
                fileName = normalizePath(`${folderPath}/${boardName}.kanban`);
            }

            // Ensure unique filename if it already exists
            let finalFileName = fileName;
            let counter = 1;
            while (vault.getAbstractFileByPath(finalFileName)) {
                if (createFolder) {
                    finalFileName = normalizePath(`${folderPath}/${boardName} ${counter}.kanban`);
                } else {
                    finalFileName = normalizePath(`${boardName} ${counter}.kanban`);
                }
                counter++;
            }

            const content = `# ${boardName}\n\n## Backlog\n\n## Todo\n\n## In Progress\n\n## Done\n`;
            const file = await vault.create(finalFileName, content);

            // Open the file
            const leaf = workspace.getLeaf(true);
            await leaf.openFile(file);
        }).open();
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
