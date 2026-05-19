import React from "react";
import { Archive, Edit2, RefreshCw, Trash2, Paperclip } from "lucide-react";
import type { Card } from "../../types";
import Markdown from "./Markdown";

interface CardItemProps {
    card: Card;
    columnId: string;
    onEdit: (card: Card) => void;
    onDelete: (cardId: string, columnId: string) => void;
    onArchive: (cardId: string, columnId: string) => void;
    onRestore: (cardId: string, columnId: string) => void;
    onDragStart: (e: React.DragEvent, card: Card) => void;
}

const CardItem: React.FC<CardItemProps> = ({
    card,
    columnId,
    onEdit,
    onDelete,
    onArchive,
    onRestore,
    onDragStart
}) => {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, card)}
            className={`bg-white p-3 rounded shadow cursor-move hover:shadow-md transition-shadow h-full ${card.archived ? 'opacity-60 bg-gray-100' : ''}`}
        >
            <div className='flex items-start justify-between'>
                <h4 className='font-medium flex-1 flex items-center gap-2 truncate'>
                    {card.archived && <Archive className='h-3 w-3 text-gray-400 shrink-0' />}
                    <span className="truncate">{card.title}</span>
                </h4>
                <div className='flex gap-1 shrink-0'>
                    <button
                        onClick={() => onEdit(card)}
                        className='p-1 rounded hover:bg-gray-100'
                        title='Edit card'
                    >
                        <Edit2 className='h-3 w-3' />
                    </button>
                    {card.archived ? (
                        <button
                            onClick={() => onRestore(card.id, columnId)}
                            className='p-1 rounded hover:bg-green-100 text-green-600'
                            title='Restore card'
                        >
                            <RefreshCw className='h-3 w-3' />
                        </button>
                    ) : (
                        <button
                            onClick={() => onArchive(card.id, columnId)}
                            className='p-1 rounded hover:bg-indigo-100 text-indigo-600'
                            title='Archive card'
                        >
                            <Archive className='h-3 w-3' />
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(card.id, columnId)}
                        className='p-1 rounded hover:bg-red-100 text-red-600'
                        title='Delete card'
                    >
                        <Trash2 className='h-3 w-3' />
                    </button>
                </div>
            </div>
            {card.description && (
                <div className="line-clamp-2 mt-1">
                    <Markdown content={card.description} className='text-sm' />
                </div>
            )}
            <div className='flex items-center gap-3 mt-2'>
                {card.due_date && (
                    <p className='text-xs text-gray-500'>Due: {new Date(card.due_date).toLocaleDateString()}</p>
                )}
                {(card.attachmentCount || 0) > 0 && (
                    <div className='flex items-center gap-1 text-gray-400' title={`${card.attachmentCount} attachments`}>
                        <Paperclip className='h-3 w-3' />
                        <span className='text-xs'>{card.attachmentCount}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(CardItem);
