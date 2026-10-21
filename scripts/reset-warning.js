console.error('To ERASE ALL LOCAL DATA and initialize again, run: docker compose down -v && npm run dev');
console.error('This deletes the local OLTP and warehouse Docker volume. Never run it against real data.');
process.exit(0);
