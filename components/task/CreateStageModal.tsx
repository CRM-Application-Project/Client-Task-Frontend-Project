import { useState } from "react";

interface CreateStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (stageData: { name: string; description: string; orderNumber: number }) => void;
  existingStagesCount: number;
}

export function CreateStageModal({
  isOpen,
  onClose,
  onSubmit,
  existingStagesCount
}: CreateStageModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    orderNumber: existingStagesCount + 1
  });

  const [errors, setErrors] = useState<{ name?: string }>({});

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: { name?: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = "Stage name is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: "",
      description: "",
      orderNumber: existingStagesCount + 1
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create New Stage</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stage Name
              <span className="text-red-500 ml-1">*</span>

            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Enter stage name (e.g., To Do, In Progress, Done)"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500"
              placeholder="Optional description for this stage"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Number
              <span className="text-red-500 ml-1">*</span>

            </label>
            <input
              type="number"
              value={formData.orderNumber}
              onChange={(e) => setFormData({ ...formData, orderNumber: parseInt(e.target.value) || 1 })}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Determines the order of stages in the board
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium text-text-white bg-brand-primary hover:bg-brand-primary/90 rounded-md"
            >
              Create Stage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}