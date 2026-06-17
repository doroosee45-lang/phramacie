import Dexie from 'dexie';

const db = new Dexie('PharmaERP_Offline');

db.version(1).stores({
  pendingSales:    '++id, createdAt, synced',
  cachedProducts:  'id, name, category, updatedAt',
  cachedClients:   'id, phone, updatedAt',
  offlineQueue:    '++id, type, data, createdAt, synced',
});

// Offline sale helpers
export const offlineDB = {
  saveSale: async (saleData) => {
    await db.pendingSales.add({ ...saleData, createdAt: new Date(), synced: false });
  },

  getPendingSales: async () => db.pendingSales.where('synced').equals(0).toArray(),

  markSynced: async (id) => db.pendingSales.update(id, { synced: true }),

  cacheProducts: async (products) => {
    await db.cachedProducts.clear();
    await db.cachedProducts.bulkPut(products.map(p => ({ ...p, id: p._id })));
  },

  getCachedProducts: async () => db.cachedProducts.toArray(),

  cacheClients: async (clients) => {
    await db.cachedClients.clear();
    await db.cachedClients.bulkPut(clients.map(c => ({ ...c, id: c._id })));
  },

  getCachedClients: async () => db.cachedClients.toArray(),

  addToQueue: async (type, data) => {
    await db.offlineQueue.add({ type, data, createdAt: new Date(), synced: false });
  },

  getPendingQueue: async () => db.offlineQueue.where('synced').equals(0).toArray(),

  clearSynced: async () => {
    await db.pendingSales.where('synced').equals(1).delete();
    await db.offlineQueue.where('synced').equals(1).delete();
  },
};

export default db;
