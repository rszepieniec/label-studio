import { createContext, useCallback, useEffect, useState, useRef } from "react";
import { DragDropContext, type DropResult } from "react-beautiful-dnd";
import { Popover } from "@headlessui/react";
import Column from "./Column";
import type { NewBoardData } from "./createData";
import styles from "./Ranker.module.scss";

interface BoardProps {
  inputData: NewBoardData;
  handleChange?: (ids: Record<string, string[]>) => void;
  readonly?: boolean;
  collapsible?: boolean;
}

type CollapsedMap = Record<string, boolean>;
type CollapsedContextType = [
  boolean,
  CollapsedMap,
  (idOrIds: string | string[], value?: boolean) => void
];

export const CollapsedContext = createContext<CollapsedContextType>([
  true,
  {},
  () => {}
]);

type Shortcuts = {
  selectUp: string;
  selectDown: string;
  moveUp: string;
  moveDown: string;
  moveTop: string;
  moveBottom: string;
  toggleItemCollapse: string;
};

const defaultShortcuts: Shortcuts = {
  selectUp: "ArrowUp",
  selectDown: "ArrowDown",
  moveUp: "w",
  moveDown: "s",
  moveTop: "q",
  moveBottom: "a",
  toggleItemCollapse: "e",
};

const Ranker = ({ inputData, handleChange, readonly, collapsible = true }: BoardProps) => {
  const [data, setData] = useState(inputData);
  const [collapsed, setCollapsed] = useState<CollapsedMap>({});
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [shortcuts, setShortcuts] = useState<Shortcuts>(defaultShortcuts);

  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boardRef.current?.focus();
  }, []);

  // ------------------------------
  // Collapsed
  // ------------------------------
  const toggleCollapsed = useCallback((idOrIds: string | string[], value?: boolean) => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    setCollapsed((c) => {
      const newState = { ...c };
      ids.forEach((id) => {
        newState[id] = value !== undefined ? value : !c[id];
      });
      return newState;
    });
  }, []);

  // ------------------------------
  // Data update
  // ------------------------------
  useEffect(() => setData(inputData), [inputData]);

  const updateColumn = (colId: string, newList: string[]) => {
    const newItemIds = { ...data.itemIds, [colId]: newList };
    setData({ ...data, itemIds: newItemIds });
    handleChange?.(newItemIds);
  };

  const findColumnByItem = (itemId: string) =>
    Object.keys(data.itemIds).find((cid) => data.itemIds[cid].includes(itemId));

  const getAllItemsLinear = () =>
    data.columns.flatMap((col) => data.itemIds[col.id]);

  const selectByOffset = (offset: number) => {
    if (!selectedItemId) return;
    const all = getAllItemsLinear();
    const idx = all.indexOf(selectedItemId);
    if (idx === -1) return;
    const next = all[idx + offset];
    if (next) {
      setSelectedItemId(next);
      document.querySelector(`[data-ranker-id="${next}"]`)?.scrollIntoView({ block: "nearest" });
    }
  };

  const moveItemByOffset = (itemId: string, offset: number) => {
    const colId = findColumnByItem(itemId);
    if (!colId) return;
    const list = [...data.itemIds[colId]];
    const index = list.indexOf(itemId);
    if (index === -1) return;
    const newIndex = Math.max(0, Math.min(list.length - 1, index + offset));
    list.splice(index, 1);
    list.splice(newIndex, 0, itemId);
    updateColumn(colId, list);
    setSelectedItemId(itemId);
  };

  const moveItemToEdge = (itemId: string, edge: "top" | "bottom") => {
    const colId = findColumnByItem(itemId);
    if (!colId) return;
    const list = [...data.itemIds[colId]].filter((id) => id !== itemId);
    if (edge === "top") list.unshift(itemId);
    else list.push(itemId);
    updateColumn(colId, list);
    setSelectedItemId(itemId);
  };

  // ------------------------------
  // Key handler
  // ------------------------------
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === shortcuts.selectUp) { selectByOffset(-1); e.preventDefault(); return; }
    if (e.key === shortcuts.selectDown) { selectByOffset(1); e.preventDefault(); return; }
    if (!selectedItemId) return;
    switch (e.key.toLowerCase()) {
      case shortcuts.moveUp: moveItemByOffset(selectedItemId, -1); e.preventDefault(); break;
      case shortcuts.moveDown: moveItemByOffset(selectedItemId, 1); e.preventDefault(); break;
      case shortcuts.moveTop: moveItemToEdge(selectedItemId, "top"); e.preventDefault(); break;
      case shortcuts.moveBottom: moveItemToEdge(selectedItemId, "bottom"); e.preventDefault(); break;
      case shortcuts.toggleItemCollapse: toggleCollapsed(selectedItemId); e.preventDefault(); break;
    }
  };

  // ------------------------------
  // Drag-drop
  // ------------------------------
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const startCol = source.droppableId;
    const endCol = destination.droppableId;

    if (startCol === endCol) {
      const newList = [...data.itemIds[startCol]];
      newList.splice(source.index, 1);
      newList.splice(destination.index, 0, draggableId);
      updateColumn(startCol, newList);
      return;
    }

    const startList = [...data.itemIds[startCol]];
    startList.splice(source.index, 1);

    const endList = [...data.itemIds[endCol]];
    endList.splice(destination.index, 0, draggableId);

    const newItemIds = { ...data.itemIds, [startCol]: startList, [endCol]: endList };
    setData({ ...data, itemIds: newItemIds });
    handleChange?.(newItemIds);
  };

  return (
    <CollapsedContext.Provider value={[collapsible, collapsed, toggleCollapsed]}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={styles.rankerHeader}>
          <Popover className={styles.popover}>
            <Popover.Button className={styles.menuButton}>Hotkeys</Popover.Button>
            <Popover.Panel className={styles.popoverPanel}>
              <h3>Hotkeys</h3>
              {Object.entries(shortcuts).map(([action, key]) => (
                <div key={action} className={styles.hotkeyRow}>
                  <span className={styles.actionLabel}>{action}</span>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) =>
                      setShortcuts((prev) => ({ ...prev, [action]: e.target.value }))
                    }
                    className={styles.hotkeyInput}
                  />
                </div>
              ))}
              <small>Wpisz klawisz do ustawienia skrótu</small>
            </Popover.Panel>
          </Popover>
        </div>

        <div className={styles.board} tabIndex={0} ref={boardRef} onKeyDown={handleKeyDown}>
          {data.columns.map((column) => {
            const items = data.itemIds[column.id]?.map((id) => data.items[id]) ?? [];
            return (
              <Column
                key={column.id}
                column={column}
                items={items}
                readonly={readonly}
                selectedItemId={selectedItemId}
                setSelectedItemId={setSelectedItemId}
              />
            );
          })}
        </div>
      </DragDropContext>
    </CollapsedContext.Provider>
  );
};

export default Ranker;
