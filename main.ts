import { Plugin, PluginSettingTab, App, Setting, WorkspaceLeaf } from "obsidian";

interface AutoRevealSettings {
  enableAutoReveal: boolean;
  whitelist: string;
  blacklist: string;
  autoCloseAllProperties: boolean;
}

const DEFAULT_SETTINGS: AutoRevealSettings = {
  enableAutoReveal: true,
  whitelist: "",
  blacklist: "",
  autoCloseAllProperties: false,
};

export default class AutoRevealPlugin extends Plugin {
  settings: AutoRevealSettings;

  async onload() {
    console.log("Auto Reveal plugin loaded");

    await this.loadSettings();

    this.addSettingTab(new AutoRevealSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on("file-open", async (file) => {
        if (!file || !this.settings.enableAutoReveal) return;

        console.log("File opened:", file.path);

        const whitelist = this.settings.whitelist
          .split(",")
          .map((word) => word.trim())
          .filter((word) => word !== "");
        const blacklist = this.settings.blacklist
          .split(",")
          .map((word) => word.trim())
          .filter((word) => word !== "");

        let shouldReveal = true;

        // Check whitelist
        if (whitelist.length > 0) {
          shouldReveal = whitelist.some((word) => file.path.includes(word));
          if (!shouldReveal) {
            console.log(
              `File path "${file.path}" does not contain any of the whitelisted words. Skipping reveal.`
            );
            return;
          }
        }

        // Check blacklist
        if (blacklist.length > 0) {
          shouldReveal = !blacklist.some((word) => file.path.includes(word));
          if (!shouldReveal) {
            console.log(
              `File path "${file.path}" contains one of the blacklisted words. Skipping reveal.`
            );
            return;
          }
        }

        const explorerLeaf = this.app.workspace.getLeavesOfType("file-explorer")[0];

        if (!explorerLeaf) {
          console.warn("File explorer is not open.");
          return;
        }

        setTimeout(() => {
          const appAny = this.app as any;
          const command = appAny.commands?.commands["file-explorer:reveal-active-file"];
          if (command && shouldReveal) {
            appAny.commands.executeCommandById("file-explorer:reveal-active-file");
            console.log("Executed reveal command");
          } else if (!command) {
            console.warn("Reveal command not found");
          }
        }, 300);
      })
    );

    this.app.workspace.onLayoutReady(() => {
      // Run the auto-close logic once on startup if the setting is enabled
      if (this.settings.autoCloseAllProperties) {
        this.checkAndCloseAllProperties();
      }
    });
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

  async checkAndCloseAllProperties() {
    // Delay slightly to ensure the layout is fully ready
    setTimeout(() => {
      this.app.workspace.iterateAllLeaves((leaf) => {
        const view = leaf.getViewState();
        if (view.type === "all-properties") {
          leaf.detach();
          console.log("Closed 'All Properties' tab.");
          return true;
        }
      });
    }, 500);
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
      .setName("Enable Auto Reveal")
      .setDesc("Master toggle to enable or disable the automatic revealing of the active file in the file explorer.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableAutoReveal)
          .onChange(async (value) => {
            this.plugin.settings.enableAutoReveal = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Whitelist")
      .setDesc("Only reveal the file if its path contains at least one of these words (case-sensitive), separated by commas. Only active if 'Enable Auto Reveal' is on. Leave empty to disable whitelist.")
      .addText((text) =>
        text
          .setPlaceholder("e.g., Daily,Project A")
          .setValue(this.plugin.settings.whitelist)
          .onChange(async (value) => {
            this.plugin.settings.whitelist = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Blacklist")
      .setDesc("Never reveal the file if its path contains any of these words (case-sensitive), separated by commas. Only active if 'Enable Auto Reveal' is on.")
      .addText((text) =>
        text
          .setPlaceholder("e.g., Archive,Temp")
          .setValue(this.plugin.settings.blacklist)
          .onChange(async (value) => {
            this.plugin.settings.blacklist = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Auto Close 'All Properties'")
      .setDesc("Automatically close the 'All Properties' tab in the core Properties view on Obsidian startup.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoCloseAllProperties)
          .onChange(async (value) => {
            this.plugin.settings.autoCloseAllProperties = value;
            await this.plugin.saveSettings();
          })
      );
  }
}