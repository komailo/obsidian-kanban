import { App, Modal, Setting } from 'obsidian';

export class CreateBoardModal extends Modal {
    boardName: string = '';
    createFolder: boolean = false;
    onSubmit: (boardName: string, createFolder: boolean) => void;

    constructor(app: App, onSubmit: (boardName: string, createFolder: boolean) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Create New Kanban Board' });

        new Setting(contentEl)
            .setName('Board Name')
            .addText(text => {
                text.setValue(this.boardName);
                text.onChange(value => {
                    this.boardName = value;
                });
                text.inputEl.focus();
            });

        new Setting(contentEl)
            .setName('Create in new folder')
            .setDesc('Creates a folder with the board name. Useful if you want to store notes related to this board in the same directory.')
            .addToggle(toggle => toggle
                .setValue(this.createFolder)
                .onChange(value => {
                    this.createFolder = value;
                }));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Create')
                .setCta()
                .onClick(() => {
                    this.close();
                    this.onSubmit(this.boardName, this.createFolder);
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
