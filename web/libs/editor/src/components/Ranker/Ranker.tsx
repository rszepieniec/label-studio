import { createContext, useCallback, useEffect, useState, useRef } from "react";
import { DragDropContext, type DropResult } from "react-beautiful-dnd";
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

// 🔹 Typy skrótów
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
  toggleItemCollapse: "e"
};

// 🔹 Komponent HotkeyRow
const HotkeyRow = ({
                     action,
                     value,
                     onChange
                   }: {
  action: string;
  value: string;
  onChange: (action: string, newValue: string) => void;
}) => (
  <div className="flex items-center justify-between gap-4 py-1">
    <span className="w-32 font-medium">{action}</span>
    <input
      type="text"
      value={value}
      placeholder="neutral"
      onChange={(e) => onChange(action, e.target.value)}
      className="input input-bordered input-sm flex-1"
    />
  </div>
);

// 🔹 Komponent HotkeysPopover
const HotkeysPopover = ({
                          shortcuts,
                          setShortcuts,
                          setModalOpen
                        }: {
  shortcuts: Shortcuts;
  setShortcuts: React.Dispatch<React.SetStateAction<Shortcuts>>;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (action: string, key: string) => {
    const duplicate = Object.entries(shortcuts).find(
      ([a, k]) => k.toLowerCase() === key.toLowerCase() && a !== action
    );
    if (duplicate) {
      setErrorMessage(`Hotkey "${key}" is already assigned to "${duplicate[0]}"`);
      return;
    }
    setErrorMessage("");
    setShortcuts((prev) => ({ ...prev, [action]: key }));
  };

  const openModal = () => {
    document.getElementById("my_modal_2")?.showModal();
    setModalOpen(true);
  };

  const closeModal = () => {
    (document.getElementById("my_modal_2") as HTMLDialogElement)?.close();
    setModalOpen(false);
    setErrorMessage("");
  };

  return (
    <div>
      <div className="w-full flex justify-center mb-4">
        <div
          className="px-4 py-2 border border-gray-400 rounded cursor-pointer select-none text-center"
          onClick={openModal}
        >
          Change Hotkeys
        </div>
      </div>

      <dialog
        id="my_modal_2"
        className="modal p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Hotkeys</h3>
          <div className="flex flex-col gap-2">
            {Object.entries(shortcuts).map(([action, key]) => (
              <HotkeyRow key={action} action={action} value={key} onChange={handleChange} />
            ))}
          </div>
          {errorMessage && <p className="text-red-500 mt-2">{errorMessage}</p>}

          <div
            className="mt-4 px-4 py-2 border border-gray-400 rounded cursor-pointer select-none text-center w-max"
            onClick={closeModal}
          >
            Close
          </div>
        </div>
      </dialog>
    </div>
  );
};

// 🔹 GŁÓWNY KOMPONENT
const Ranker = ({ inputData, handleChange, readonly, collapsible = true }: BoardProps) => {
  const [data, setData] = useState(inputData);
  const [collapsed, setCollapsed] = useState<CollapsedMap>({});
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [shortcuts, setShortcuts] = useState<Shortcuts>(defaultShortcuts);
  const [hotkeysModalOpen, setHotkeysModalOpen] = useState(false);

  const boardRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef(data);
  const selectedRef = useRef(selectedItemId);

  useEffect(() => {
    boardRef.current?.focus();
  }, []);

  useEffect(() => { dataRef.current = data }, [data]);
  useEffect(() => { selectedRef.current = selectedItemId }, [selectedItemId]);

  // ---------------- Collapsed ----------------
  const toggleCollapsed = useCallback(
    (idOrIds: string | string[], value?: boolean) => {
      const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      setCollapsed((c) => {
        const newState = { ...c };
        ids.forEach((id) => {
          newState[id] = value !== undefined ? value : !c[id];
        });
        return newState;
      });
    },
    []
  );

  // ---------------- Data update ----------------
  useEffect(() => setData(inputData), [inputData]);

  const updateColumn = (colId: string, newList: string[]) => {
    const newItemIds = { ...dataRef.current.itemIds, [colId]: newList };
    setData({ ...dataRef.current, itemIds: newItemIds });
    handleChange?.(newItemIds);
  };

  const findColumnByItem = (itemId: string) =>
    Object.keys(dataRef.current.itemIds).find((cid) => dataRef.current.itemIds[cid].includes(itemId));

  const getAllItemsLinear = () => dataRef.current.columns.flatMap((col) => dataRef.current.itemIds[col.id]);

  const selectByOffset = (offset: number) => {
    const currentSelected = selectedRef.current;
    if (!currentSelected) return;
    const all = getAllItemsLinear();
    const idx = all.indexOf(currentSelected);
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
    const list = [...dataRef.current.itemIds[colId]];
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
    const list = [...dataRef.current.itemIds[colId]].filter((id) => id !== itemId);
    if (edge === "top") list.unshift(itemId);
    else list.push(itemId);
    updateColumn(colId, list);
    setSelectedItemId(itemId);
  };

  // ---------------- Key handler global ----------------
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (hotkeysModalOpen) return;

      const currentSelected = selectedRef.current;
      if (!currentSelected) return;

      switch (e.key) {
        case shortcuts.selectUp: selectByOffset(-1); e.preventDefault(); break;
        case shortcuts.selectDown: selectByOffset(1); e.preventDefault(); break;
        case shortcuts.moveUp: moveItemByOffset(currentSelected, -1); e.preventDefault(); break;
        case shortcuts.moveDown: moveItemByOffset(currentSelected, 1); e.preventDefault(); break;
        case shortcuts.moveTop: moveItemToEdge(currentSelected, "top"); e.preventDefault(); break;
        case shortcuts.moveBottom: moveItemToEdge(currentSelected, "bottom"); e.preventDefault(); break;
        case shortcuts.toggleItemCollapse: toggleCollapsed(currentSelected); e.preventDefault(); break;
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [shortcuts, hotkeysModalOpen, toggleCollapsed]);

  // ---------------- Drag-drop ----------------
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const startCol = source.droppableId;
    const endCol = destination.droppableId;

    if (startCol === endCol) {
      const newList = [...dataRef.current.itemIds[startCol]];
      newList.splice(source.index, 1);
      newList.splice(destination.index, 0, draggableId);
      updateColumn(startCol, newList);
      return;
    }

    const startList = [...dataRef.current.itemIds[startCol]];
    startList.splice(source.index, 1);

    const endList = [...dataRef.current.itemIds[endCol]];
    endList.splice(destination.index, 0, draggableId);

    const newItemIds = { ...dataRef.current.itemIds, [startCol]: startList, [endCol]: endList };
    setData({ ...dataRef.current, itemIds: newItemIds });
    handleChange?.(newItemIds);
  };

  // ---------------- RENDER ----------------
  return (
    <CollapsedContext.Provider value={[collapsible, collapsed, toggleCollapsed]}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={styles.rankerHeader}>
          <HotkeysPopover
            shortcuts={shortcuts}
            setShortcuts={setShortcuts}
            setModalOpen={setHotkeysModalOpen}
          />
        </div>

        <div className={styles.board} tabIndex={0} ref={boardRef}>
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
