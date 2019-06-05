/* import * as express from 'express';
import { CronsController } from './crons.controller';
let router = express();
const cron = new CronsController();
router.get('/download-file', (req, res, next) => {
    cron.downloadFile(req, res, next);
});

router.get('/opt-out', (req, res, next) => {
    cron.optOut(req, res, next);
});
/* router.get('/master-import', (req, res, next) => {
    cron.masterImport(req, res, next);
}); */

// export default router;