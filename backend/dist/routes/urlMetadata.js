"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const urlMetadataController_1 = require("../controllers/urlMetadataController");
const router = (0, express_1.Router)();
// Öffentliche Route - keine Authentifizierung erforderlich
router.get('/', urlMetadataController_1.getUrlMetadata);
exports.default = router;
//# sourceMappingURL=urlMetadata.js.map