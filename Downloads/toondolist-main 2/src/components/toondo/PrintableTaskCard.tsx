
import type { Task } from "@/types/task";
import { format } from "date-fns";

interface PrintableTaskCardProps {
  task: Task;
}

export function PrintableTaskCard({ task }: PrintableTaskCardProps) {
  // Forcing white background and black text for print, regardless of task.color
  const printBackgroundColor = '#FFFFFF';
  const printTextColor = '#000000';

  return (
    <div className="printable-card-content p-6 border rounded-lg shadow-none" style={{ backgroundColor: printBackgroundColor, color: printTextColor, width: '18cm', height:'10cm', margin: '1cm auto', breakInside: 'avoid' }}>
      <h2 className="text-3xl font-bold mb-2" style={{ color: printTextColor }}>{task.title}</h2>
      {task.description && (
        <p className="text-base mb-4" style={{ color: printTextColor }}>{task.description}</p>
      )}
      {task.dueDate && (
        <p className="text-sm mb-2" style={{ color: printTextColor }}>
          <strong>Due Date:</strong> {format(new Date(task.dueDate), "PPP")}
        </p>
      )}
      <p className="text-sm" style={{ color: printTextColor }}>
        <strong>Status:</strong> {task.completed ? "Completed" : "Pending"}
      </p>
       <div style={{ marginTop: '20px', borderTop: '1px dashed #666', paddingTop: '10px', textAlign: 'center' }}>
        <p style={{ fontSize: '0.8em', color: '#333' }}>ToonDo List - Your Awesome Task!</p>
      </div>
    </div>
  );
}
