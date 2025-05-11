import type { Task } from "@/types/task";
import { format } from "date-fns";

interface PrintableTaskCardProps {
  task: Task;
}

export function PrintableTaskCard({ task }: PrintableTaskCardProps) {
  return (
    <div className="printable-card-content p-6 border rounded-lg shadow-none" style={{ backgroundColor: task.color, color: '#000000', width: '18cm', height:'10cm', margin: '1cm auto', breakInside: 'avoid' }}>
      <h2 className="text-3xl font-bold mb-2" style={{ color: '#000000' }}>{task.title}</h2>
      {task.description && (
        <p className="text-base mb-4" style={{ color: '#000000' }}>{task.description}</p>
      )}
      {task.dueDate && (
        <p className="text-sm mb-2" style={{ color: '#000000' }}>
          <strong>Due Date:</strong> {format(new Date(task.dueDate), "PPP")}
        </p>
      )}
      <p className="text-sm" style={{ color: '#000000' }}>
        <strong>Status:</strong> {task.completed ? "Completed" : "Pending"}
      </p>
       <div style={{ marginTop: '20px', borderTop: '1px dashed #666', paddingTop: '10px', textAlign: 'center' }}>
        <p style={{ fontSize: '0.8em', color: '#333' }}>ToonDo List - Your Awesome Task!</p>
      </div>
    </div>
  );
}
