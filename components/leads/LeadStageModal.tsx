import { useState, useEffect } from "react";

interface CreateLeadStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (stageData: {
    name: string;
    description: string;
    orderNumber: number;
  }) => void;
  existingStagesCount: number;
}

export function CreateLeadStageModal({
  isOpen,
  onClose,
  onSubmit,
  existingStagesCount,
}: CreateLeadStageModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    orderNumber: existingStagesCount + 1,
  });

  const [errors, setErrors] = useState<{ name?: string; orderNumber?: string }>(
    {}
  );
  const [isFormValid, setIsFormValid] = useState(false);
  const [touched, setTouched] = useState<{
    name?: boolean;
    orderNumber?: boolean;
  }>({});

  // Validation with touched logic
  useEffect(() => {
    const newErrors: { name?: string; orderNumber?: string } = {};

    if (touched.name) {
      if (!formData.name.trim()) {
        newErrors.name = "Stage name is required";
      } else if (formData.name.trim().length < 2) {
        newErrors.name = "Stage name must be at least 2 characters";
      } else if (formData.name.trim().length > 50) {
        newErrors.name = "Stage name cannot exceed 50 characters";
      }
    }

    if (touched.orderNumber) {
      if (formData.orderNumber < 1) {
        newErrors.orderNumber = "Order number must be at least 1";
      } else if (!Number.isInteger(formData.orderNumber)) {
        newErrors.orderNumber = "Order number must be a whole number";
      }
    }

    setErrors(newErrors);
    setIsFormValid(Object.keys(newErrors).length === 0);
  }, [formData, touched]);

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();

    // Force all fields to touched on submit
    setTouched({ name: true, orderNumber: true });

    if (!isFormValid) return;

    onSubmit(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: "",
      description: "",
      orderNumber: existingStagesCount + 1,
    });
    setErrors({});
    setTouched({});
    onClose();
  };

  // Update order number when existingStagesCount changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      orderNumber: existingStagesCount + 1,
    }));
  }, [existingStagesCount]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create New Lead Stage</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stage Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                const value = e.target.value;
                // allow only letters and spaces
                const cleaned = value.replace(/[^a-zA-Z\s]/g, "");
                setFormData({ ...formData, name: cleaned });
              }}
              onBlur={() => setTouched({ ...touched, name: true })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter stage name (e.g., New Lead, Contacted, Qualified)"
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
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500"
              placeholder="Optional description for this lead stage"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Number *
            </label>
            <input
              type="number"
              value={formData.orderNumber}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  orderNumber: parseInt(e.target.value) || 1,
                })
              }
              onBlur={() => setTouched({ ...touched, orderNumber: true })}
              min="1"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 ${
                errors.orderNumber ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.orderNumber ? (
              <p className="text-red-500 text-sm mt-1">{errors.orderNumber}</p>
            ) : (
              <p className="text-sm text-gray-500 mt-1">
                Determines the order of stages in the pipeline
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                isFormValid
                  ? "bg-[#636363] hover:bg-gray-700 cursor-pointer"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Create Lead Stage
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
