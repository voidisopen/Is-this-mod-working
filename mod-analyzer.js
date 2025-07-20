class MinecraftModAnalyzer {
    constructor() {
        this.uploadArea = document.getElementById('upload-area');
        this.fileInput = document.getElementById('file-input');
        this.progressSection = document.getElementById('progress-section');
        this.progressBar = document.getElementById('progress-bar');
        this.progressText = document.getElementById('progress-text');
        this.resultsSection = document.getElementById('results-section');
        this.modResults = document.getElementById('mod-results');
        
        this.analyzedMods = [];
        this.compatibilityRules = this.initializeCompatibilityRules();
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Drag and drop functionality
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('drag-over');
        });

        this.uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('drag-over');
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files).filter(file => file.name.endsWith('.jar'));
            if (files.length > 0) {
                this.analyzeFiles(files);
            }
        });

        // File input change
        this.fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                this.analyzeFiles(files);
            }
        });

        // Export report
        document.getElementById('export-report').addEventListener('click', () => {
            this.exportReport();
        });
    }

    initializeCompatibilityRules() {
        return {
            supportedMinecraftVersions: [
                '1.21.8', '1.21.7', '1.21.6', '1.21.5', '1.21.4', '1.21.3', '1.21.2', '1.21.1', '1.21',
                '1.20.6', '1.20.5', '1.20.4', '1.20.3', '1.20.2', '1.20.1', '1.20',
                '1.19.4', '1.19.3', '1.19.2', '1.19.1', '1.19',
                '1.18.2', '1.18.1', '1.18',
                '1.17.1', '1.17',
                '1.16.5', '1.16.4', '1.16.3', '1.16.2', '1.16.1', '1.16',
                '1.15.2', '1.15.1', '1.15',
                '1.14.4', '1.14.3', '1.14.2', '1.14.1', '1.14',
                '1.13.2', '1.13.1', '1.13',
                '1.12.2', '1.12.1', '1.12',
                '1.11.2', '1.11.1', '1.11',
                '1.10.2', '1.10.1', '1.10',
                '1.9.4', '1.9.3', '1.9.2', '1.9.1', '1.9',
                '1.8.9', '1.8.8', '1.8.7', '1.8.6', '1.8.5', '1.8.4', '1.8.3', '1.8.2', '1.8.1', '1.8'
            ],
            supportedLoaders: ['fabric', 'quilt', 'forge', 'neoforge'],
            requiredFields: ['id', 'version', 'name'],
            loaderCompatibility: {
                'quilt': ['fabric', 'quilt'],
                'fabric': ['fabric'],
                'forge': ['forge'],
                'neoforge': ['neoforge', 'forge']
            },
            knownCompatibleMods: {
                'show-durability': {
                    name: 'Show Durability',
                    author: 'Thomilist',
                    compatible: true,
                    notes: 'Compatible with Fabric/Quilt'
                },
                'armor-durability-hud': {
                    name: 'Armor Durability HUD',
                    compatible: true,
                    notes: 'Multi-loader support'
                }
            }
        };
    }

    async analyzeFiles(files) {
        this.analyzedMods = [];
        this.showProgress();
        
        const totalFiles = files.length;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            this.updateProgress((i / totalFiles) * 100, `Analyzing ${file.name}...`);
            
            try {
                const modData = await this.analyzeJarFile(file);
                this.analyzedMods.push(modData);
            } catch (error) {
                console.error(`Error analyzing ${file.name}:`, error);
                this.analyzedMods.push({
                    filename: file.name,
                    error: error.message,
                    compatible: false,
                    status: 'error'
                });
            }
        }
        
        this.updateProgress(100, 'Analysis complete!');
        setTimeout(() => {
            this.hideProgress();
            this.displayResults();
        }, 1000);
    }

    async analyzeJarFile(file) {
        const zip = new JSZip();
        const zipData = await zip.loadAsync(file);
        
        // Look for mod metadata files
        const metadataFiles = [
            'fabric.mod.json',      // Fabric mods
            'quilt.mod.json',       // Quilt mods
            'META-INF/mods.toml',   // NeoForge/Forge mods
            'mcmod.info',           // Legacy Forge mods
            'mod.json'              // Generic fallback
        ];
        
        let metadata = null;
        let metadataType = null;
        
        for (const metadataFile of metadataFiles) {
            if (zipData.files[metadataFile]) {
                const content = await zipData.files[metadataFile].async('text');
                try {
                    if (metadataFile.endsWith('.toml')) {
                        // Parse TOML content (simple parser for mods.toml)
                        metadata = this.parseModsToml(content);
                    } else {
                        // Parse JSON content
                        metadata = JSON.parse(content);
                    }
                    metadataType = metadataFile;
                    break;
                } catch (e) {
                    console.warn(`Failed to parse ${metadataFile} in ${file.name}:`, e);
                }
            }
        }
        
        if (!metadata) {
            throw new Error('No valid mod metadata found (fabric.mod.json, quilt.mod.json, mods.toml, mcmod.info, or mod.json)');
        }
        
        // Analyze compatibility
        const analysis = this.analyzeCompatibility(metadata, metadataType, file.name);
        
        return {
            filename: file.name,
            metadata: metadata,
            metadataType: metadataType,
            ...analysis
        };
    }

    analyzeCompatibility(metadata, metadataType, filename) {
        const issues = [];
        const warnings = [];
        let compatible = true;
        let status = 'compatible';
        
        // Get selected compatibility settings
        const selectedLoader = document.getElementById('mod-loader').value;
        const selectedVersion = document.getElementById('minecraft-version').value;
        
        // Check required fields
        for (const field of this.compatibilityRules.requiredFields) {
            if (!metadata[field]) {
                issues.push(`Missing required field: ${field}`);
                compatible = false;
            }
        }
        
        // Check Minecraft version compatibility
        if (metadata.depends && metadata.depends.minecraft) {
            const mcVersion = metadata.depends.minecraft;
            const isCompatible = this.checkMinecraftVersion(mcVersion, selectedVersion);
            if (!isCompatible) {
                issues.push(`Minecraft version "${mcVersion}" not compatible with selected version ${selectedVersion}`);
                compatible = false;
            }
        } else if (metadata.environment) {
            warnings.push('No explicit Minecraft version dependency found - may need manual verification');
        }
        
        // Check mod loader compatibility
        const loaderCompatible = this.checkLoaderCompatibility(metadataType, selectedLoader);
        if (!loaderCompatible.compatible) {
            issues.push(loaderCompatible.message);
            compatible = false;
        } else if (loaderCompatible.warning) {
            warnings.push(loaderCompatible.warning);
        }
        
        // Check for known mod compatibility
        if (metadata.id && this.compatibilityRules.knownCompatibleMods[metadata.id]) {
            const knownMod = this.compatibilityRules.knownCompatibleMods[metadata.id];
            if (knownMod.compatible) {
                warnings.push(`Known compatible mod: ${knownMod.notes}`);
            }
        }
        
        // Check for specific dependencies
        if (metadata.depends) {
            if (metadata.depends.fabric && (selectedLoader === 'quilt' || selectedLoader === 'fabric')) {
                warnings.push('Requires Fabric API - ensure it\'s installed');
            } else if (metadata.depends.forge && (selectedLoader === 'forge' || selectedLoader === 'neoforge')) {
                warnings.push('Requires Forge API');
            }
        }
        
        // Version-specific warnings
        if (this.isLegacyVersion(selectedVersion)) {
            warnings.push(`Selected version ${selectedVersion} is older - mod may have limited features`);
        }
        
        // Determine final status
        if (issues.length > 0) {
            status = 'incompatible';
            compatible = false;
        } else if (warnings.length > 0) {
            status = 'warning';
        }
        
        return {
            compatible,
            status,
            issues,
            warnings,
            name: metadata.name || metadata.id || filename,
            version: metadata.version || 'Unknown',
            description: metadata.description || '',
            author: this.extractAuthor(metadata),
            environment: metadata.environment || 'unknown',
            selectedLoader: selectedLoader,
            selectedVersion: selectedVersion
        };
    }

    checkMinecraftVersion(versionSpec, targetVersion) {
        // Handle different version specification formats
        if (typeof versionSpec === 'string') {
            // Simple version string - check if it matches or is compatible with target
            return versionSpec.includes(targetVersion) || 
                   this.isVersionCompatible(versionSpec, targetVersion);
        } else if (Array.isArray(versionSpec)) {
            // Array of versions - check if target is in the array
            return versionSpec.some(v => 
                v === targetVersion || this.isVersionCompatible(v, targetVersion)
            );
        } else if (typeof versionSpec === 'object') {
            // Version range object - check ranges
            return this.checkVersionRange(versionSpec, targetVersion);
        }
        return false;
    }

    isVersionCompatible(specVersion, targetVersion) {
        // Extract major.minor versions for comparison
        const getMajorMinor = (version) => {
            const parts = version.split('.');
            return `${parts[0]}.${parts[1]}`;
        };
        
        const specMajorMinor = getMajorMinor(specVersion);
        const targetMajorMinor = getMajorMinor(targetVersion);
        
        return specMajorMinor === targetMajorMinor;
    }

    checkVersionRange(versionRange, targetVersion) {
        // Handle version range objects like {">=": "1.20", "<": "1.22"}
        const targetParts = targetVersion.split('.').map(Number);
        
        for (const [operator, rangeVersion] of Object.entries(versionRange)) {
            const rangeParts = rangeVersion.split('.').map(Number);
            const comparison = this.compareVersions(targetParts, rangeParts);
            
            switch (operator) {
                case '>=':
                    if (comparison < 0) return false;
                    break;
                case '>':
                    if (comparison <= 0) return false;
                    break;
                case '<=':
                    if (comparison > 0) return false;
                    break;
                case '<':
                    if (comparison >= 0) return false;
                    break;
                case '=':
                case '==':
                    if (comparison !== 0) return false;
                    break;
                case '~':
                    // Tilde allows patch-level changes
                    if (targetParts[0] !== rangeParts[0] || targetParts[1] !== rangeParts[1]) return false;
                    break;
            }
        }
        return true;
    }

    compareVersions(version1Parts, version2Parts) {
        for (let i = 0; i < Math.max(version1Parts.length, version2Parts.length); i++) {
            const part1 = version1Parts[i] || 0;
            const part2 = version2Parts[i] || 0;
            
            if (part1 < part2) return -1;
            if (part1 > part2) return 1;
        }
        return 0;
    }

    checkLoaderCompatibility(metadataType, selectedLoader) {
        const modLoaderFromMetadata = this.getLoaderFromMetadata(metadataType);
        const compatibleLoaders = this.compatibilityRules.loaderCompatibility[selectedLoader] || [];
        
        if (compatibleLoaders.includes(modLoaderFromMetadata)) {
            if (modLoaderFromMetadata === selectedLoader) {
                return { compatible: true };
            } else {
                return { 
                    compatible: true, 
                    warning: `${modLoaderFromMetadata} mod running on ${selectedLoader} - should work through compatibility layer`
                };
            }
        } else {
            return { 
                compatible: false, 
                message: `${modLoaderFromMetadata} mod is not compatible with ${selectedLoader}`
            };
        }
    }

    getLoaderFromMetadata(metadataType) {
        switch (metadataType) {
            case 'fabric.mod.json': return 'fabric';
            case 'quilt.mod.json': return 'quilt';
            case 'META-INF/mods.toml': return 'neoforge'; // NeoForge/Forge mods
            case 'mcmod.info': return 'forge'; // Legacy Forge
            case 'mod.json': return 'forge'; // Assume forge for generic mod.json
            default: return 'unknown';
        }
    }

    isLegacyVersion(version) {
        const versionParts = version.split('.').map(Number);
        const majorMinor = `${versionParts[0]}.${versionParts[1]}`;
        
        // Consider versions before 1.16 as legacy
        const legacyVersions = ['1.8', '1.9', '1.10', '1.11', '1.12', '1.13', '1.14', '1.15'];
        return legacyVersions.includes(majorMinor);
    }

    parseModsToml(tomlContent) {
        // Simple TOML parser for mods.toml files
        const lines = tomlContent.split('\n');
        const metadata = {};
        let currentSection = null;
        let mods = [];
        let currentMod = {};
        
        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('#')) continue;
            
            // Section headers
            if (line.startsWith('[') && line.endsWith(']')) {
                if (line === '[[mods]]') {
                    if (Object.keys(currentMod).length > 0) {
                        mods.push(currentMod);
                    }
                    currentMod = {};
                    currentSection = 'mod';
                } else {
                    currentSection = line.slice(1, -1);
                }
                continue;
            }
            
            // Key-value pairs
            const equalIndex = line.indexOf('=');
            if (equalIndex > 0) {
                const key = line.substring(0, equalIndex).trim();
                let value = line.substring(equalIndex + 1).trim();
                
                // Remove quotes from values
                if ((value.startsWith('"') && value.endsWith('"')) || 
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                
                if (currentSection === 'mod') {
                    currentMod[key] = value;
                } else {
                    metadata[key] = value;
                }
            }
        }
        
        // Add the last mod if exists
        if (Object.keys(currentMod).length > 0) {
            mods.push(currentMod);
        }
        
        // Use the first mod as the main metadata
        if (mods.length > 0) {
            const mainMod = mods[0];
            return {
                id: mainMod.modId || mainMod.id,
                version: mainMod.version,
                name: mainMod.displayName || mainMod.name || mainMod.id,
                description: mainMod.description || '',
                author: mainMod.authors || mainMod.author || 'Unknown',
                depends: {
                    minecraft: metadata.minecraftVersionRange || mainMod.minecraftVersionRange || 
                             metadata.minecraft || mainMod.minecraft
                },
                environment: mainMod.side || 'both',
                loaderVersion: metadata.loaderVersion || mainMod.loaderVersion,
                _isToml: true,
                _allMods: mods
            };
        }
        
        return metadata;
    }

    extractAuthor(metadata) {
        if (metadata.authors && Array.isArray(metadata.authors)) {
            return metadata.authors.map(author => 
                typeof author === 'string' ? author : author.name || author.id
            ).join(', ');
        } else if (metadata.author) {
            return metadata.author;
        } else if (metadata.contact && metadata.contact.owner) {
            return metadata.contact.owner;
        }
        return 'Unknown';
    }

    showProgress() {
        this.progressSection.style.display = 'block';
        this.resultsSection.style.display = 'none';
    }

    updateProgress(percent, text) {
        this.progressBar.style.width = percent + '%';
        this.progressText.textContent = text;
    }

    hideProgress() {
        this.progressSection.style.display = 'none';
    }

    displayResults() {
        this.resultsSection.style.display = 'block';
        
        // Update summary cards
        const compatible = this.analyzedMods.filter(mod => mod.status === 'compatible').length;
        const warnings = this.analyzedMods.filter(mod => mod.status === 'warning').length;
        const incompatible = this.analyzedMods.filter(mod => mod.status === 'incompatible' || mod.status === 'error').length;
        
        document.getElementById('compatible-count').textContent = compatible;
        document.getElementById('warning-count').textContent = warnings;
        document.getElementById('incompatible-count').textContent = incompatible;
        
        // Display detailed results
        this.modResults.innerHTML = '';
        
        this.analyzedMods.forEach(mod => {
            const modCard = this.createModCard(mod);
            this.modResults.appendChild(modCard);
        });
        
        // Scroll to results
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    createModCard(mod) {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        
        let statusClass = '';
        let statusIcon = '';
        let statusText = '';
        
        switch (mod.status) {
            case 'compatible':
                statusClass = 'border-success';
                statusIcon = 'fas fa-check-circle text-success';
                statusText = 'Compatible';
                break;
            case 'warning':
                statusClass = 'border-warning';
                statusIcon = 'fas fa-exclamation-triangle text-warning';
                statusText = 'Needs Review';
                break;
            case 'incompatible':
            case 'error':
                statusClass = 'border-danger';
                statusIcon = 'fas fa-times-circle text-danger';
                statusText = mod.error ? 'Error' : 'Incompatible';
                break;
        }
        
        card.className += ' ' + statusClass;
        
        const issuesHtml = mod.issues && mod.issues.length > 0 ? 
            `<div class="mt-2">
                <strong class="text-danger">Issues:</strong>
                <ul class="list-unstyled mb-0 mt-1">
                    ${mod.issues.map(issue => `<li><i class="fas fa-times text-danger me-2"></i>${issue}</li>`).join('')}
                </ul>
            </div>` : '';
        
        const warningsHtml = mod.warnings && mod.warnings.length > 0 ? 
            `<div class="mt-2">
                <strong class="text-warning">Notes:</strong>
                <ul class="list-unstyled mb-0 mt-1">
                    ${mod.warnings.map(warning => `<li><i class="fas fa-info-circle text-warning me-2"></i>${warning}</li>`).join('')}
                </ul>
            </div>` : '';
        
        const errorHtml = mod.error ? 
            `<div class="mt-2">
                <strong class="text-danger">Error:</strong>
                <p class="mb-0 mt-1 text-danger">${mod.error}</p>
            </div>` : '';
        
        card.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h5 class="card-title mb-1">${mod.name || mod.filename}</h5>
                        <div class="text-muted small">
                            <i class="fas fa-file-archive me-1"></i>${mod.filename}
                            ${mod.version ? ` • v${mod.version}` : ''}
                            ${mod.author ? ` • by ${mod.author}` : ''}
                        </div>
                    </div>
                    <span class="badge bg-${mod.status === 'compatible' ? 'success' : mod.status === 'warning' ? 'warning' : 'danger'} fs-6">
                        <i class="${statusIcon} me-1"></i>${statusText}
                    </span>
                </div>
                
                ${mod.description ? `<p class="card-text text-muted">${mod.description}</p>` : ''}
                
                ${mod.metadataType ? `
                    <div class="mb-2">
                        <small class="text-muted">
                            <i class="fas fa-cog me-1"></i>Metadata: ${mod.metadataType}
                            ${mod.environment ? ` • Environment: ${mod.environment}` : ''}
                            ${mod.selectedLoader ? ` • Target: ${mod.selectedLoader.charAt(0).toUpperCase() + mod.selectedLoader.slice(1)} ${mod.selectedVersion}` : ''}
                        </small>
                    </div>
                ` : ''}
                
                ${errorHtml}
                ${issuesHtml}
                ${warningsHtml}
            </div>
        `;
        
        return card;
    }

    exportReport() {
        const report = {
            generated: new Date().toISOString(),
            summary: {
                total: this.analyzedMods.length,
                compatible: this.analyzedMods.filter(mod => mod.status === 'compatible').length,
                warnings: this.analyzedMods.filter(mod => mod.status === 'warning').length,
                incompatible: this.analyzedMods.filter(mod => mod.status === 'incompatible' || mod.status === 'error').length
            },
            mods: this.analyzedMods.map(mod => ({
                filename: mod.filename,
                name: mod.name,
                version: mod.version,
                author: mod.author,
                status: mod.status,
                compatible: mod.compatible,
                issues: mod.issues || [],
                warnings: mod.warnings || [],
                error: mod.error || null
            }))
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'minecraft-mod-compatibility-report.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize the analyzer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MinecraftModAnalyzer();
});
