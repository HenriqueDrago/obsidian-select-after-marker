import { Plugin, PluginSettingTab, App, Setting, WorkspaceLeaf, Notice, MarkdownView } from "obsidian";

interface AutoRevealSettings {
  enableAutoReveal: boolean;
  whitelist: string;
  blacklist: string;
  autoCloseAllProperties: boolean;
  gitButtonLocation: "ribbon" | "statusbar" | "both" | "none";
}

const DEFAULT_SETTINGS: AutoRevealSettings = {
  enableAutoReveal: true,
  whitelist: "",
  blacklist: "",
  autoCloseAllProperties: false,
  gitButtonLocation: "ribbon",
};

export default class AutoRevealPlugin extends Plugin {
  settings: AutoRevealSettings;
  ribbonGitCloseButton: any | undefined;
  statusBarGitCloseButton: HTMLElement | undefined;

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
      this.manageGitCloseButton();
    });
  }

  onunload() {
    console.log("Auto Reveal plugin unloaded");
    this.removeAllGitCloseButtons();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.manageGitCloseButton(); // Update button visibility based on settings
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

  async manageGitCloseButton() {

    const appAny = this.app as any;
    const obsidianGit = appAny.plugins.getPlugin("obsidian-git");
    const commandId = "obsidian-git:backup-and-close";

    if (!obsidianGit || !appAny.commands?.commands?.[commandId]) {
      this.removeAllGitCloseButtons();
      new Notice(obsidianGit ? `Obsidian Git command '${commandId}' not found.` : "Obsidian Git plugin not found.");
      return;
    }

    // Handle Ribbon Button
    if (this.settings.gitButtonLocation === "ribbon" || this.settings.gitButtonLocation === "both") {
      if (!this.ribbonGitCloseButton) {
        this.ribbonGitCloseButton = this.addRibbonIcon("git-fork", "Commit, Sync & Close", this.executeGitCloseCommand);
      }
    } else {
      this.removeRibbonButton();
    }

    // Handle Status Bar Button
    if (this.settings.gitButtonLocation === "statusbar" || this.settings.gitButtonLocation === "both") {
      if (!this.statusBarGitCloseButton) {
        this.statusBarGitCloseButton = this.addStatusBarItem();
        this.statusBarGitCloseButton.setText("Git Close");
        this.statusBarGitCloseButton.addEventListener("click", this.executeGitCloseCommand);
      }
    } else {
      this.removeStatusBarButton();
    }

    // Handle "none" case
    if (this.settings.gitButtonLocation === "none") {
      this.removeRibbonButton();
      this.removeStatusBarButton();
    }
  }

  executeGitCloseCommand = async () => {
    const appAny = this.app as any;
    const commandId = "obsidian-git:backup-and-close";
    try {
      await appAny.commands.executeCommandById(commandId);
      new Notice("Attempting to commit, sync, and close Obsidian.");
    } catch (error) {
      console.error("Error executing Obsidian Git command:", error);
      new Notice("Error executing Git command.");
    }
  };

  removeAllGitCloseButtons() {
    this.removeRibbonButton();
    this.removeStatusBarButton();
  }

  removeRibbonButton() {
    if (this.ribbonGitCloseButton && this.ribbonGitCloseButton.remove) {
      this.ribbonGitCloseButton.remove();
      this.ribbonGitCloseButton = undefined;
    }
  }

  removeStatusBarButton() {
    if (this.statusBarGitCloseButton) {
      this.statusBarGitCloseButton.remove();
      this.statusBarGitCloseButton = undefined;
    }
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

    new Setting(containerEl)
      .setName("Git Button Location")
      .setDesc("Choose where the 'Commit, Sync & Close' button should appear.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            ribbon: "Ribbon",
            statusbar: "Status Bar",
            both: "Both",
            none: "None",
          })
          .setValue(this.plugin.settings.gitButtonLocation)
          .onChange(async (value: "ribbon" | "statusbar" | "both" | "none") => {
            this.plugin.settings.gitButtonLocation = value;
            await this.plugin.saveSettings();
          })
      );
  }
}