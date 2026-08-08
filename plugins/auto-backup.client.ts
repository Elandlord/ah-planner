export default defineNuxtPlugin(() => {
    useAutoBackup()
        .init()
        .catch(() => {});
});
