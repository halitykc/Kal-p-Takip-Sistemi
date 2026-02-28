const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'kalip.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'database', 'schema.sql');
const SEED_PATH = path.join(__dirname, '..', 'database', 'seed.sql');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let _db = null; // raw sql.js Database

function save() {
    if (_db) {
        const data = _db.export();
        fs.writeFileSync(DB_PATH, Buffer.from(data));
    }
}

// Compatibility wrapper mimicking better-sqlite3 API
const db = {
    prepare(sql) {
        return {
            run(...params) {
                // Flatten if single array argument
                const flatParams = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
                _db.run(sql, flatParams);
                const lastId = _db.exec("SELECT last_insert_rowid() as id");
                const changes = _db.getRowsModified();
                save(); // Auto-save after writes
                return {
                    lastInsertRowid: lastId.length > 0 ? lastId[0].values[0][0] : 0,
                    changes: changes
                };
            },
            get(...params) {
                const flatParams = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
                let stmt;
                try {
                    stmt = _db.prepare(sql);
                    if (flatParams.length > 0) stmt.bind(flatParams);
                    if (stmt.step()) {
                        const cols = stmt.getColumnNames();
                        const vals = stmt.get();
                        const row = {};
                        cols.forEach((col, i) => { row[col] = vals[i]; });
                        stmt.free();
                        return row;
                    }
                    stmt.free();
                    return undefined;
                } catch (err) {
                    if (stmt) try { stmt.free(); } catch (e) { }
                    throw err;
                }
            },
            all(...params) {
                const flatParams = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
                let stmt;
                try {
                    stmt = _db.prepare(sql);
                    if (flatParams.length > 0) stmt.bind(flatParams);
                    const rows = [];
                    while (stmt.step()) {
                        const cols = stmt.getColumnNames();
                        const vals = stmt.get();
                        const row = {};
                        cols.forEach((col, i) => { row[col] = vals[i]; });
                        rows.push(row);
                    }
                    stmt.free();
                    return rows;
                } catch (err) {
                    if (stmt) try { stmt.free(); } catch (e) { }
                    throw err;
                }
            }
        };
    },

    exec(sql) {
        _db.exec(sql);
        save();
    },

    pragma(pragmaStr) {
        try { _db.exec(`PRAGMA ${pragmaStr}`); } catch (e) { }
    },

    transaction(fn) {
        return (...args) => {
            _db.exec('BEGIN TRANSACTION');
            try {
                fn(...args);
                _db.exec('COMMIT');
                save();
            } catch (err) {
                _db.exec('ROLLBACK');
                throw err;
            }
        };
    }
};

async function initializeDB() {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        _db = new SQL.Database(fileBuffer);
    } else {
        _db = new SQL.Database();
    }

    _db.exec('PRAGMA foreign_keys = ON');

    // Run schema (CREATE IF NOT EXISTS - safe to re-run)
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    _db.exec(schema);

    // Check if we need to seed
    const result = _db.exec("SELECT COUNT(*) as count FROM users");
    const userCount = result[0].values[0][0];
    if (userCount === 0) {
        const seed = fs.readFileSync(SEED_PATH, 'utf-8');
        _db.exec(seed);
        console.log('  \u2713 Varsayilan veriler yuklendi.');
    }

    save();
    console.log('  \u2713 Veritabani hazir:', DB_PATH);
    return db;
}

module.exports = { db, initializeDB };
