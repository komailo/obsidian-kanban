import { App, PluginSettingTab, Setting } from "obsidian";
import KanbanPlugin from "./main";

export interface KanbanSettings {
	defaultLanes: string[];
}

export const DEFAULT_SETTINGS: KanbanSettings = {
	defaultLanes: ['Backlog', 'Todo', 'In Progress', 'Done']
}

export class KanbanSettingTab extends PluginSettingTab {
	plugin: KanbanPlugin;

	constructor(app: App, plugin: KanbanPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

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
	}
}
