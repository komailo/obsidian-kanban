import { App, PluginSettingTab, Setting } from "obsidian";
import KanbanPlugin from "./main";

export interface KanbanSettings {
	defaultLanes: string[];
	newCardInsertionMethod: 'append' | 'prepend';
	newLineTrigger: 'enter' | 'shift-enter';
}

export const DEFAULT_SETTINGS: KanbanSettings = {
	defaultLanes: ['Backlog', 'Todo', 'In Progress', 'Done'],
	newCardInsertionMethod: 'append',
	newLineTrigger: 'shift-enter',
}

export class KanbanSettingTab extends PluginSettingTab {
	plugin: KanbanPlugin;

	constructor(app: App, plugin: KanbanPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Default lanes')
			.setDesc('Default swim lanes for new Kanban boards (one per line)')
			.addTextArea(text => text
				.setPlaceholder('Backlog\nTodo\nIn Progress\nDone')
				.setValue(this.plugin.settings.defaultLanes.join('\n'))
				.onChange(async (value) => {
					this.plugin.settings.defaultLanes = value.split('\n').filter(l => l.trim() !== '');
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('New card insertion method')
			.setDesc('Whether new cards are added to the beginning or end of the list')
			.addDropdown(dropdown => dropdown
				.addOption('append', 'Append')
				.addOption('prepend', 'Prepend')
				.setValue(this.plugin.settings.newCardInsertionMethod)
				.onChange(async (value: 'append' | 'prepend') => {
					this.plugin.settings.newCardInsertionMethod = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('New line trigger')
			.setDesc('Whether Enter or Shift+Enter creates a new line in a card')
			.addDropdown(dropdown => dropdown
				.addOption('shift-enter', 'Shift + Enter')
				.addOption('enter', 'Enter')
				.setValue(this.plugin.settings.newLineTrigger)
				.onChange(async (value: 'enter' | 'shift-enter') => {
					this.plugin.settings.newLineTrigger = value;
					await this.plugin.saveSettings();
				}));
	}
}
