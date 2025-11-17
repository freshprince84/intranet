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
var slugify_1 = __importDefault(require("slugify"));
var prisma = new client_1.PrismaClient();
/**
 * Liste von Verzeichnissen, die ausgeschlossen werden sollen
 */
var EXCLUDED_DIRECTORIES = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
    'uploads',
    'claude', // Claude-spezifische Dokumente
    'implementation_plans',
    'implementation_reports',
    'analysis',
    'systemDocTemplates'
];
/**
 * Erstellt einen eindeutigen Slug
 */
function createUniqueSlug(title) {
    return __awaiter(this, void 0, void 0, function () {
        var baseSlug, slug, counter, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    baseSlug = (0, slugify_1.default)(title, { lower: true, strict: true });
                    slug = baseSlug;
                    counter = 1;
                    _a.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma.cerebroCarticle.findUnique({
                            where: { slug: slug }
                        })];
                case 2:
                    existing = _a.sent();
                    if (!existing) {
                        return [2 /*return*/, slug];
                    }
                    slug = "".concat(baseSlug, "-").concat(counter);
                    counter++;
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Findet alle Markdown-Dateien im docs-Verzeichnis
 */
function findAllMarkdownFiles(dir, baseDir, files) {
    if (files === void 0) { files = []; }
    var entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
    var _loop_1 = function (entry) {
        var fullPath = path_1.default.join(dir, entry.name);
        var relativePath = path_1.default.relative(baseDir, fullPath);
        if (entry.isDirectory()) {
            // Prüfe, ob Verzeichnis ausgeschlossen werden soll
            var shouldExclude = EXCLUDED_DIRECTORIES.some(function (excluded) {
                return relativePath.includes(excluded) || entry.name === excluded;
            });
            if (!shouldExclude) {
                findAllMarkdownFiles(fullPath, baseDir, files);
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
 * Erstellt oder findet den Markdown-Überordner
 */
function getOrCreateMarkdownFolder(adminUserId) {
    return __awaiter(this, void 0, void 0, function () {
        var existing, slug, newFolder;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.cerebroCarticle.findFirst({
                        where: {
                            OR: [
                                { title: 'Intranet - Überblick' },
                                { title: 'Markdown-Dateien' },
                                { slug: 'intranet-ueberblick' },
                                { slug: 'markdown-folder' }
                            ],
                            parentId: null
                        }
                    })];
                case 1:
                    existing = _a.sent();
                    if (existing) {
                        return [2 /*return*/, existing.id];
                    }
                    return [4 /*yield*/, createUniqueSlug('Intranet - Überblick')];
                case 2:
                    slug = _a.sent();
                    return [4 /*yield*/, prisma.cerebroCarticle.create({
                            data: {
                                title: 'Intranet - Überblick',
                                content: '# Intranet - Überblick\n\nDieser Ordner enthält alle Dokumentationsartikel aus dem Git-Repository.',
                                slug: slug,
                                parentId: null,
                                createdById: adminUserId,
                                isPublished: true,
                                position: 1
                            }
                        })];
                case 3:
                    newFolder = _a.sent();
                    return [2 /*return*/, newFolder.id];
            }
        });
    });
}
/**
 * Erstellt oder findet einen Unterordner basierend auf dem Verzeichnis
 */
function getOrCreateSubFolder(folderName, parentId, adminUserId) {
    return __awaiter(this, void 0, void 0, function () {
        var existing, slug, newFolder;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.cerebroCarticle.findFirst({
                        where: {
                            title: folderName,
                            parentId: parentId
                        }
                    })];
                case 1:
                    existing = _a.sent();
                    if (existing) {
                        return [2 /*return*/, existing.id];
                    }
                    return [4 /*yield*/, createUniqueSlug(folderName)];
                case 2:
                    slug = _a.sent();
                    return [4 /*yield*/, prisma.cerebroCarticle.create({
                            data: {
                                title: folderName,
                                content: "# ".concat(folderName, "\n\nArtikel in diesem Ordner."),
                                slug: slug,
                                parentId: parentId,
                                createdById: adminUserId,
                                isPublished: true
                            }
                        })];
                case 3:
                    newFolder = _a.sent();
                    return [2 /*return*/, newFolder.id];
            }
        });
    });
}
/**
 * Importiert eine Markdown-Datei
 */
function importMarkdownFile(filePath, markdownFolderId, adminUserId) {
    return __awaiter(this, void 0, void 0, function () {
        var repoRoot, fullPath, content, fileName, title, dirPath, parentId, relativeDir, dirParts, currentParentId, _i, dirParts_1, dirPart, folderName, slug, existing, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 12, , 13]);
                    repoRoot = path_1.default.resolve(__dirname, '../../');
                    fullPath = path_1.default.join(repoRoot, filePath);
                    if (!fs_1.default.existsSync(fullPath)) {
                        console.log("\u26A0\uFE0F  Datei nicht gefunden: ".concat(filePath));
                        return [2 /*return*/];
                    }
                    content = fs_1.default.readFileSync(fullPath, 'utf8');
                    fileName = path_1.default.basename(filePath, '.md');
                    title = fileName
                        .replace(/_/g, ' ')
                        .replace(/-/g, ' ')
                        .split(' ')
                        .map(function (word) { return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); })
                        .join(' ');
                    dirPath = path_1.default.dirname(filePath);
                    parentId = markdownFolderId;
                    if (!(dirPath && dirPath !== '.' && dirPath !== 'docs')) return [3 /*break*/, 5];
                    relativeDir = dirPath.replace(/^docs\//, '');
                    if (!(relativeDir && relativeDir !== 'docs')) return [3 /*break*/, 5];
                    dirParts = relativeDir.split(path_1.default.sep);
                    currentParentId = markdownFolderId;
                    _i = 0, dirParts_1 = dirParts;
                    _a.label = 1;
                case 1:
                    if (!(_i < dirParts_1.length)) return [3 /*break*/, 4];
                    dirPart = dirParts_1[_i];
                    folderName = dirPart
                        .replace(/_/g, ' ')
                        .replace(/-/g, ' ')
                        .split(' ')
                        .map(function (word) { return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); })
                        .join(' ');
                    return [4 /*yield*/, getOrCreateSubFolder(folderName, currentParentId, adminUserId)];
                case 2:
                    currentParentId = _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    parentId = currentParentId;
                    _a.label = 5;
                case 5: return [4 /*yield*/, createUniqueSlug(title)];
                case 6:
                    slug = _a.sent();
                    return [4 /*yield*/, prisma.cerebroCarticle.findFirst({
                            where: {
                                OR: [
                                    { githubPath: filePath },
                                    { slug: slug }
                                ]
                            }
                        })];
                case 7:
                    existing = _a.sent();
                    if (!existing) return [3 /*break*/, 9];
                    // Aktualisiere bestehenden Artikel
                    return [4 /*yield*/, prisma.cerebroCarticle.update({
                            where: { id: existing.id },
                            data: {
                                content: content,
                                parentId: parentId,
                                githubPath: filePath,
                                isPublished: true
                            }
                        })];
                case 8:
                    // Aktualisiere bestehenden Artikel
                    _a.sent();
                    console.log("\u2705 Aktualisiert: ".concat(title));
                    return [3 /*break*/, 11];
                case 9: 
                // Erstelle neuen Artikel
                return [4 /*yield*/, prisma.cerebroCarticle.create({
                        data: {
                            title: title,
                            content: content,
                            slug: slug,
                            parentId: parentId,
                            createdById: adminUserId,
                            isPublished: true,
                            githubPath: filePath
                        }
                    })];
                case 10:
                    // Erstelle neuen Artikel
                    _a.sent();
                    console.log("\u2795 Erstellt: ".concat(title));
                    _a.label = 11;
                case 11: return [3 /*break*/, 13];
                case 12:
                    error_1 = _a.sent();
                    console.error("\u274C Fehler beim Importieren von ".concat(filePath, ":"), error_1);
                    return [3 /*break*/, 13];
                case 13: return [2 /*return*/];
            }
        });
    });
}
/**
 * Importiert README.md aus dem Root
 */
function importReadme(markdownFolderId, adminUserId) {
    return __awaiter(this, void 0, void 0, function () {
        var readmePath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    readmePath = path_1.default.resolve(__dirname, '../../README.md');
                    if (!fs_1.default.existsSync(readmePath)) return [3 /*break*/, 2];
                    return [4 /*yield*/, importMarkdownFile('README.md', markdownFolderId, adminUserId)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    });
}
/**
 * Hauptfunktion
 */
function importAllDocsToCerebro() {
    return __awaiter(this, void 0, void 0, function () {
        var adminUser, markdownFolderId, repoRoot, docsDir, allMdFiles, _i, allMdFiles_1, file, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 8, 9, 11]);
                    console.log('📚 Starte Import aller Dokumentationsdateien...\n');
                    return [4 /*yield*/, prisma.user.findFirst({
                            where: {
                                OR: [
                                    { id: 1 },
                                    { username: 'admin' }
                                ]
                            }
                        })];
                case 1:
                    adminUser = _a.sent();
                    if (!adminUser) {
                        throw new Error('Kein Admin-User gefunden!');
                    }
                    console.log("\uD83D\uDC64 Verwende Admin-User: ".concat(adminUser.username, " (ID: ").concat(adminUser.id, ")\n"));
                    return [4 /*yield*/, getOrCreateMarkdownFolder(adminUser.id)];
                case 2:
                    markdownFolderId = _a.sent();
                    console.log("\uD83D\uDCC1 Markdown-Ordner ID: ".concat(markdownFolderId, "\n"));
                    repoRoot = path_1.default.resolve(__dirname, '../../');
                    docsDir = path_1.default.join(repoRoot, 'docs');
                    allMdFiles = [];
                    if (fs_1.default.existsSync(docsDir)) {
                        findAllMarkdownFiles(docsDir, repoRoot, allMdFiles);
                    }
                    console.log("\uD83D\uDCCA Gefunden: ".concat(allMdFiles.length, " Markdown-Dateien in docs/\n"));
                    // Importiere README.md
                    return [4 /*yield*/, importReadme(markdownFolderId, adminUser.id)];
                case 3:
                    // Importiere README.md
                    _a.sent();
                    console.log('');
                    _i = 0, allMdFiles_1 = allMdFiles;
                    _a.label = 4;
                case 4:
                    if (!(_i < allMdFiles_1.length)) return [3 /*break*/, 7];
                    file = allMdFiles_1[_i];
                    return [4 /*yield*/, importMarkdownFile(file, markdownFolderId, adminUser.id)];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7:
                    console.log('\n' + '='.repeat(100));
                    console.log('\n✅ Import abgeschlossen!\n');
                    console.log("   \uD83D\uDCC1 Markdown-Ordner: Intranet - \u00DCberblick");
                    console.log("   \uD83D\uDCC4 Importierte Dateien: ".concat(allMdFiles.length + 1, " (inkl. README.md)"));
                    console.log('\n' + '='.repeat(100));
                    return [3 /*break*/, 11];
                case 8:
                    error_2 = _a.sent();
                    console.error('❌ Fehler beim Import:', error_2);
                    throw error_2;
                case 9: return [4 /*yield*/, prisma.$disconnect()];
                case 10:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 11: return [2 /*return*/];
            }
        });
    });
}
// Starte Import
importAllDocsToCerebro().catch(function (error) {
    console.error('Unbehandelter Fehler:', error);
    process.exit(1);
});
