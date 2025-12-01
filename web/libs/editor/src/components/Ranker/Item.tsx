import React, { useContext, useMemo } from "react";
import { Draggable } from "react-beautiful-dnd";
import { CollapsedContext } from "./Ranker";
import { sanitizeHtml } from "../../utils/html";
import styles from "./Ranker.module.scss";

interface ItemProps {
  item: any; // użyj InputItem jeśli masz typ
  index: number;
  readonly?: boolean;
  selectedItemId: string | null;
  setSelectedItemId: (id: string) => void;
}

const Item = ({ item, index, readonly, selectedItemId, setSelectedItemId }: ItemProps) => {
  const [collapsible, collapsedMap, toggleCollapsed] = useContext(CollapsedContext);
  const collapsed = collapsedMap[item.id] ?? false;

  const html = useMemo(() => (item.html ? sanitizeHtml(item.html) : ""), [item.html]);
  const toggle = collapsible ? () => toggleCollapsed(item.id, !collapsed) : undefined;
  const isSelected = selectedItemId === item.id;

  const classNames = [
    styles.item,
    collapsible ? (collapsed ? styles.collapsed : styles.expanded) : "",
    isSelected ? styles.selected : ""
  ].join(" ");

  return (
    <Draggable draggableId={item.id} index={index} isDragDisabled={readonly}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          data-ranker-id={item.id}
          onClick={() => setSelectedItemId(item.id)}
          className={classNames}
          tabIndex={0}
        >
          {item.title && (
            <h3 className={styles.itemTitle} onClick={toggle}>
              {item.title}
            </h3>
          )}
          {item.body && <p className={styles.itemLine}>{item.body}</p>}
          {item.html && (
            <p
              className={styles.itemLine}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      )}
    </Draggable>
  );
};

export default Item;
