import { Plugin, PluginSettingTab, App, Setting } from "obsidian";

interface AutoRevealSettings {
  triggerWord: string;
}

const DEFAULT_SETTINGS: AutoRevealSettings = {
  triggerWord: "",
};

export default class AutoRevealPlugin extends Plugin {
  settings: AutoRevealSettings;

  async onload() {
    console.log("Auto Reveal plugin loaded");

    await this.loadSettings();

    this.addSettingTab(new AutoRevealSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on("file-open", async (file) => {
        if (!file) return;

        console.log("File opened:", file.path);

        // Check if the trigger word is set and if the file path contains it
        if (this.settings.triggerWord && !file.path.includes(this.settings.triggerWord)) {
          console.log(`File path "${file.path}" does not contain "${this.settings.triggerWord}". Skipping reveal.`);
          return;
        }

        const explorerLeaf = this.app.workspace.getLeavesOfType("file-explorer")[0];

        if (!explorerLeaf) {
          console.warn("File explorer is not open.");
          return;
        }

        setTimeout(() => {
          const appAny = this.app as any;
          const command = appAny.commands?.commands["file-explorer:reveal-active-file"];
          if (command) {
            appAny.commands.executeCommandById("file-explorer:reveal-active-file");
            console.log("Executed reveal command");
          } else {
            console.warn("Reveal command not found");
          }
        }, 300);
      })
    );
  }

  onunload() {
    console.log("Auto Reveal plugin unloaded");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class AutoRevealSettingTab extends PluginSettingTab {
  plugin: AutoRevealPlugin;

  constructor(app: App, plugin: AutoRevealPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Auto Reveal Settings" });

    new Setting(containerEl)
      .setName("Trigger Word")
      .setDesc("Only reveal the file in the explorer if its path contains this word (case-sensitive). Leave empty to always reveal.")
      .addText((text) =>
        text
          .setPlaceholder("e.g., Daily Notes")
          .setValue(this.plugin.settings.triggerWord)
          .onChange(async (value) => {
            this.plugin.settings.triggerWord = value;
            await this.plugin.saveSettings();
          })
      );
  }
}