import { clsx } from 'clsx';

const Table = ({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data available',
  selectable = false,
  selectedRows = [],
  onSelectChange
}) => {
  const isAllSelected = data.length > 0 && selectedRows.length === data.length;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      onSelectChange(data.map(row => row._id));
    } else {
      onSelectChange([]);
    }
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    if (e.target.checked) {
      onSelectChange([...selectedRows, id]);
    } else {
      onSelectChange(selectedRows.filter(rowId => rowId !== id));
    }
  };

  return (
    <div className="overflow-x-auto shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 text-white">
          <tr className="bg-blue-600">
            {selectable && (
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                />
              </th>
            )}
            {columns.map((column, index) => (
              <th
                key={index}
                className={clsx(
                  'px-6 py-3 text-left text-xs font-bold uppercase tracking-wider',
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-8 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={row._id || rowIndex}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  onRowClick && 'cursor-pointer hover:bg-gray-50',
                  selectedRows.includes(row._id) && 'bg-blue-50',
                  'transition-colors'
                )}
              >
                {selectable && (
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedRows.includes(row._id)}
                      onChange={(e) => handleSelectRow(e, row._id)}
                    />
                  </td>
                )}
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render
                      ? column.render(row)
                      : typeof column.accessor === 'function'
                        ? column.accessor(row)
                        : row[column.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
