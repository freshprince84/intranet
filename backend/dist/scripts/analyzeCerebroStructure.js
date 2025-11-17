"use strict";
/// <reference types="node" />
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var prisma = new client_1.PrismaClient();
/**
 * Prüft, ob eine Datei lokal existiert
 */
function fileExistsLocally(filePath) {
    var repoRoot = path_1.default.resolve(__dirname, '../../');
    var fullPath = path_1.default.join(repoRoot, filePath);
    return fs_1.default.existsSync(fullPath);
}
/**
 * Findet alle Markdown-Dateien im docs-Verzeichnis
 */
function findAllMarkdownFilesInDocs(dir, baseDir, files) {
    if (files === void 0) { files = []; }
    var entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
    var _loop_1 = function (entry) {
        var fullPath = path_1.default.join(dir, entry.name);
        var relativePath = path_1.default.relative(baseDir, fullPath);
        if (entry.isDirectory()) {
            var ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'uploads'];
            if (!ignoreDirs.some(function (ignore) { return entry.name.includes(ignore); })) {
                findAllMarkdownFilesInDocs(fullPath, baseDir, files);
            }
        }
        else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(relativePath);
        }
    };
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var entry = entries_1[_i];
        _loop_1(entry);
    }
    return files;
}
/**
 * Analysiert die Cerebro-Struktur
 */
function analyzeCerebroStructure() {
    return __awaiter(this, void 0, void 0, function () {
        var allArticles, articlesWithGithubPath, articlesWithoutGithubPath, rootArticles, markdownFolder, articlesInMarkdownFolder, standaloneArticles, articlesWithMissingFiles, _i, articlesWithGithubPath_1, article, repoRoot, docsDir, allLocalMdFiles, readmePath, articlesWithLocalFilesButNotInServer, _loop_2, _a, allLocalMdFiles_1, file;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('🔍 Analysiere Cerebro-Struktur...\n');
                    return [4 /*yield*/, prisma.cerebroCarticle.findMany({
                            include: {
                                parent: true,
                                children: true
                            },
                            orderBy: [
                                { position: 'asc' },
                                { title: 'asc' }
                            ]
                        })];
                case 1:
                    allArticles = _b.sent();
                    console.log("\uD83D\uDCCA Gefunden: ".concat(allArticles.length, " Artikel insgesamt\n"));
                    articlesWithGithubPath = allArticles.filter(function (a) { return a.githubPath !== null; });
                    articlesWithoutGithubPath = allArticles.filter(function (a) { return a.githubPath === null; });
                    rootArticles = allArticles.filter(function (a) { return a.parentId === null; });
                    markdownFolder = allArticles.find(function (a) {
                        return a.title === 'Markdown-Dateien' ||
                            a.slug === 'markdown-folder' ||
                            a.title === 'Intranet - Überblick';
                    }) || null;
                    articlesInMarkdownFolder = markdownFolder
                        ? allArticles.filter(function (a) { return a.parentId === markdownFolder.id; })
                        : [];
                    standaloneArticles = rootArticles.filter(function (a) {
                        return a.id !== (markdownFolder === null || markdownFolder === void 0 ? void 0 : markdownFolder.id);
                    });
                    articlesWithMissingFiles = [];
                    for (_i = 0, articlesWithGithubPath_1 = articlesWithGithubPath; _i < articlesWithGithubPath_1.length; _i++) {
                        article = articlesWithGithubPath_1[_i];
                        if (article.githubPath && !fileExistsLocally(article.githubPath)) {
                            articlesWithMissingFiles.push({
                                article: article,
                                githubPath: article.githubPath
                            });
                        }
                    }
                    repoRoot = path_1.default.resolve(__dirname, '../../');
                    docsDir = path_1.default.join(repoRoot, 'docs');
                    allLocalMdFiles = [];
                    if (fs_1.default.existsSync(docsDir)) {
                        findAllMarkdownFilesInDocs(docsDir, repoRoot, allLocalMdFiles);
                    }
                    readmePath = path_1.default.join(repoRoot, 'README.md');
                    if (fs_1.default.existsSync(readmePath)) {
                        allLocalMdFiles.push('README.md');
                    }
                    articlesWithLocalFilesButNotInServer = [];
                    _loop_2 = function (file) {
                        var existsInCerebro = allArticles.some(function (a) { return a.githubPath === file; });
                        if (!existsInCerebro) {
                            var title = path_1.default.basename(file, '.md').replace(/_/g, ' ').replace(/-/g, ' ');
                            articlesWithLocalFilesButNotInServer.push({ file: file, title: title });
                        }
                    };
                    for (_a = 0, allLocalMdFiles_1 = allLocalMdFiles; _a < allLocalMdFiles_1.length; _a++) {
                        file = allLocalMdFiles_1[_a];
                        _loop_2(file);
                    }
                    return [2 /*return*/, {
                            totalArticles: allArticles.length,
                            articlesWithGithubPath: articlesWithGithubPath.length,
                            articlesWithoutGithubPath: articlesWithoutGithubPath.length,
                            rootArticles: rootArticles,
                            markdownFolder: markdownFolder,
                            articlesInMarkdownFolder: articlesInMarkdownFolder,
                            standaloneArticles: standaloneArticles,
                            articlesWithMissingFiles: articlesWithMissingFiles,
                            articlesWithLocalFilesButNotInServer: articlesWithLocalFilesButNotInServer
                        }];
            }
        });
    });
}
/**
 * Gibt die Analyse-Ergebnisse aus
 */
function printAnalysisResults(result) {
    var _a;
    console.log('='.repeat(100));
    console.log('\n📊 ZUSAMMENFASSUNG DER CEREBRO-STRUKTUR\n');
    console.log('='.repeat(100));
    console.log("\n\uD83D\uDCC8 Gesamtstatistik:");
    console.log("   - Gesamt Artikel: ".concat(result.totalArticles));
    console.log("   - Artikel mit githubPath (aus Git/Docs): ".concat(result.articlesWithGithubPath));
    console.log("   - Artikel ohne githubPath (manuell erstellt): ".concat(result.articlesWithoutGithubPath));
    console.log("\n\uD83D\uDCC1 Struktur:");
    console.log("   - Root-Artikel (ohne Parent): ".concat(result.rootArticles.length));
    if (result.markdownFolder) {
        console.log("   - Markdown-Ordner gefunden: \"".concat(result.markdownFolder.title, "\" (ID: ").concat(result.markdownFolder.id, ")"));
        console.log("   - Artikel im Markdown-Ordner: ".concat(result.articlesInMarkdownFolder.length));
    }
    else {
        console.log("   - \u26A0\uFE0F  Markdown-Ordner NICHT gefunden!");
    }
    console.log("   - Standalone-Artikel (Root, aber nicht Markdown-Ordner): ".concat(result.standaloneArticles.length));
    // Zeige Root-Artikel
    if (result.rootArticles.length > 0) {
        console.log("\n\uD83D\uDCCB Root-Artikel (Top-Level):");
        for (var _i = 0, _b = result.rootArticles; _i < _b.length; _i++) {
            var article = _b[_i];
            var isMarkdown = article.id === ((_a = result.markdownFolder) === null || _a === void 0 ? void 0 : _a.id);
            var marker = isMarkdown ? '📁' : '📄';
            console.log("   ".concat(marker, " ").concat(article.title, " (ID: ").concat(article.id, ", Slug: ").concat(article.slug, ")"));
            if (article.githubPath) {
                console.log("      \u2514\u2500 githubPath: ".concat(article.githubPath));
            }
        }
    }
    // Zeige Standalone-Artikel
    if (result.standaloneArticles.length > 0) {
        console.log("\n\uD83D\uDCC4 Standalone-Artikel (sollten auf gleicher Ebene wie Markdown-Ordner sein):");
        for (var _c = 0, _d = result.standaloneArticles; _c < _d.length; _c++) {
            var article = _d[_c];
            console.log("   - ".concat(article.title, " (ID: ").concat(article.id, ", Slug: ").concat(article.slug, ")"));
            if (article.githubPath) {
                console.log("     \u2514\u2500 githubPath: ".concat(article.githubPath));
            }
        }
    }
    // Zeige Artikel im Markdown-Ordner
    if (result.articlesInMarkdownFolder.length > 0) {
        console.log("\n\uD83D\uDCC1 Artikel im Markdown-Ordner (".concat(result.articlesInMarkdownFolder.length, "):"));
        // Gruppiere nach Verzeichnis
        var grouped = {};
        for (var _e = 0, _f = result.articlesInMarkdownFolder; _e < _f.length; _e++) {
            var article = _f[_e];
            if (article.githubPath) {
                var dir = path_1.default.dirname(article.githubPath);
                if (!grouped[dir]) {
                    grouped[dir] = [];
                }
                grouped[dir].push(article);
            }
            else {
                if (!grouped['[Ohne githubPath]']) {
                    grouped['[Ohne githubPath]'] = [];
                }
                grouped['[Ohne githubPath]'].push(article);
            }
        }
        var sortedDirs = Object.keys(grouped).sort();
        for (var _g = 0, sortedDirs_1 = sortedDirs; _g < sortedDirs_1.length; _g++) {
            var dir = sortedDirs_1[_g];
            console.log("\n   \uD83D\uDCC2 ".concat(dir, "/"));
            for (var _h = 0, _j = grouped[dir]; _h < _j.length; _h++) {
                var article = _j[_h];
                console.log("      - ".concat(article.title, " (").concat(article.githubPath || 'kein githubPath', ")"));
            }
        }
    }
    // Zeige Artikel mit fehlenden Dateien
    if (result.articlesWithMissingFiles.length > 0) {
        console.log("\n\u274C Artikel mit fehlenden lokalen Dateien (".concat(result.articlesWithMissingFiles.length, "):"));
        for (var _k = 0, _l = result.articlesWithMissingFiles; _k < _l.length; _k++) {
            var item = _l[_k];
            console.log("   - ".concat(item.article.title));
            console.log("     \u2514\u2500 githubPath: ".concat(item.githubPath, " (Datei nicht gefunden!)"));
        }
    }
    // Zeige lokale Dateien, die nicht in Cerebro sind
    if (result.articlesWithLocalFilesButNotInServer.length > 0) {
        console.log("\n\uD83D\uDCDD Lokale Markdown-Dateien, die NICHT in Cerebro sind (".concat(result.articlesWithLocalFilesButNotInServer.length, "):"));
        // Gruppiere nach Verzeichnis
        var grouped = {};
        for (var _m = 0, _o = result.articlesWithLocalFilesButNotInServer; _m < _o.length; _m++) {
            var item = _o[_m];
            var dir = path_1.default.dirname(item.file);
            if (!grouped[dir]) {
                grouped[dir] = [];
            }
            grouped[dir].push(item);
        }
        var sortedDirs = Object.keys(grouped).sort();
        for (var _p = 0, sortedDirs_2 = sortedDirs; _p < sortedDirs_2.length; _p++) {
            var dir = sortedDirs_2[_p];
            console.log("\n   \uD83D\uDCC2 ".concat(dir, "/"));
            for (var _q = 0, _r = grouped[dir]; _q < _r.length; _q++) {
                var item = _r[_q];
                console.log("      - ".concat(item.file));
            }
        }
    }
    // Empfehlungen
    console.log("\n".concat('='.repeat(100)));
    console.log('\n💡 EMPFEHLUNGEN ZUR STRUKTUR-VERBESSERUNG:\n');
    if (!result.markdownFolder) {
        console.log('   ⚠️  1. Markdown-Ordner fehlt!');
        console.log('      → Erstelle einen Root-Artikel mit Titel "Intranet - Überblick" oder "Markdown-Dateien"');
        console.log('      → Alle Artikel mit githubPath sollten als Kinder dieses Ordners sein\n');
    }
    if (result.standaloneArticles.length > 0) {
        console.log("   \u26A0\uFE0F  2. ".concat(result.standaloneArticles.length, " Standalone-Artikel gefunden"));
        console.log('      → Diese sollten auf gleicher Ebene wie der Markdown-Ordner sein');
        console.log('      → Struktur sollte sein:');
        console.log('         - Standalone-Artikel (gleiche Ebene)');
        console.log('         - Markdown-Ordner (Überordner für alle Git/Docs-Artikel)');
        console.log('            └─ Alle Artikel aus docs/ und Git\n');
    }
    if (result.articlesWithMissingFiles.length > 0) {
        console.log("   \u26A0\uFE0F  3. ".concat(result.articlesWithMissingFiles.length, " Artikel verweisen auf nicht existierende Dateien"));
        console.log('      → Prüfe die githubPath-Werte und korrigiere sie\n');
    }
    if (result.articlesWithLocalFilesButNotInServer.length > 0) {
        console.log("   \u26A0\uFE0F  4. ".concat(result.articlesWithLocalFilesButNotInServer.length, " lokale Dateien sind nicht in Cerebro"));
        console.log('      → Diese sollten importiert werden\n');
    }
    console.log('='.repeat(100));
}
/**
 * Hauptfunktion
 */
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, 3, 5]);
                    return [4 /*yield*/, analyzeCerebroStructure()];
                case 1:
                    result = _a.sent();
                    printAnalysisResults(result);
                    return [3 /*break*/, 5];
                case 2:
                    error_1 = _a.sent();
                    console.error('❌ Fehler bei der Analyse:', error_1);
                    throw error_1;
                case 3: return [4 /*yield*/, prisma.$disconnect()];
                case 4:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// Starte Analyse
main().catch(function (error) {
    console.error('Unbehandelter Fehler:', error);
    process.exit(1);
});
