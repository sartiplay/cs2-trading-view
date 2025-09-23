import { readData, writeData } from "./data-storage.server";

// Generate a unique ID for items (same function as in data-storage.server.ts)
function generateItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function migrateDataToUseIds(): Promise<void> {
  console.log("[Migration] Starting data migration to add item IDs...");
  
  const data = await readData();
  let migrationNeeded = false;
  
  // Check if any items are missing IDs
  const itemsArray = Object.entries(data.items);
  
  for (const [key, item] of itemsArray) {
    if (!item.id) {
      migrationNeeded = true;
      break;
    }
  }
  
  if (!migrationNeeded) {
    console.log("[Migration] No migration needed - all items already have IDs");
    return;
  }
  
  console.log("[Migration] Migration needed - adding IDs to existing items...");
  
  // Create new items object with IDs as keys
  const newItems: Record<string, any> = {};
  
  for (const [oldKey, item] of itemsArray) {
    // Generate new ID if item doesn't have one
    const itemId = item.id || generateItemId();
    
    // Add ID to item if it doesn't have one
    const updatedItem = {
      ...item,
      id: itemId,
      created_at: item.created_at || new Date().toISOString(),
    };
    
    // Use the item ID as the new key
    newItems[itemId] = updatedItem;
    
    console.log(`[Migration] Migrated item: ${item.market_hash_name} -> ${itemId}`);
  }
  
  // Update sold items to include IDs if they don't have them
  const updatedSoldItems = data.sold_items.map(soldItem => ({
    ...soldItem,
    id: soldItem.id || generateItemId(),
  }));
  
  // Update the data structure
  const updatedData = {
    ...data,
    items: newItems,
    sold_items: updatedSoldItems,
  };
  
  await writeData(updatedData);
  
  console.log(`[Migration] Successfully migrated ${itemsArray.length} items to use IDs`);
}
