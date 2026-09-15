import React, { useState, useEffect } from 'react';
import { BasicInfo, SurveyType, INVESTIGATOR_OPTIONS } from '../types';
import { Settings, Plus, Minus, Check, X } from 'lucide-react';

interface BasicInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  basicInfo: BasicInfo;
  onSave: (newInfo: BasicInfo) => void;
}

export const BasicInfoModal: React.FC<BasicInfoModalProps> = ({
  isOpen,
  onClose,
  basicInfo,
  onSave,
}) => {
  const [formData, setFormData] = useState<BasicInfo>(basicInfo);

  useEffect(() => {
    if (isOpen) {
      setFormData(basicInfo);
    }
  }, [isOpen, basicInfo]);

  if (!isOpen) return null;

  const handleProjectNumberChange = (delta: number) => {
    setFormData((prev) => {
      const currentVal = parseInt(prev.projectNumber || '0', 10);
      const nextVal = isNaN(currentVal) ? (delta > 0 ? 1 : 0) : Math.max(0, currentVal + delta);
      return {
        ...prev,
        projectNumber: nextVal === 0 ? '' : String(nextVal),
      };
    });
  };

  const handleHouseNumberChange = (delta: number) => {
    setFormData((prev) => ({
      ...prev,
      houseNumber: Math.max(1, prev.houseNumber + delta),
    }));
  };

  const handleFolderNumberChange = (delta: number) => {
    setFormData((prev) => ({
      ...prev,
      folderNumber: Math.max(1, prev.folderNumber + delta),
    }));
  };

  const handleSurveyTypeChange = (type: SurveyType) => {
    setFormData((prev) => ({
      ...prev,
      surveyType: type,
    }));
  };

  const handleSurveyNumberChange = (num: string) => {
    setFormData((prev) => ({
      ...prev,
      surveyNumber: prev.surveyNumber === num ? '' : num,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Settings size={20} />
            基本情報設定
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '4px 8px', border: 'none', background: 'none' }}
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* 工番 */}
          <div className="form-group">
            <label className="form-label">工番</label>
            <div className="number-stepper">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleProjectNumberChange(-1)}
              >
                <Minus size={20} />
              </button>
              <input
                type="text"
                className="stepper-input"
                value={formData.projectNumber || ''}
                placeholder="（未入力）"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    projectNumber: e.target.value,
                  })
                }
              />
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleProjectNumberChange(1)}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* 家屋番号 */}
          <div className="form-group">
            <label className="form-label">家屋番号</label>
            <div className="number-stepper">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleHouseNumberChange(-1)}
              >
                <Minus size={20} />
              </button>
              <input
                type="number"
                className="stepper-input"
                value={formData.houseNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    houseNumber: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                min="1"
              />
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleHouseNumberChange(1)}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* 調査種別 */}
          <div className="form-group">
            <label className="form-label">調査種別</label>
            <div className="survey-toggle-group">
              {(['外部', '内部', '傾斜'] as SurveyType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`toggle-btn ${
                    formData.surveyType === type ? 'selected' : ''
                  }`}
                  onClick={() => handleSurveyTypeChange(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 調査番号 */}
          <div className="form-group">
            <label className="form-label">調査番号</label>
            <div className="survey-toggle-group">
              {['①', '②', '③', '④'].map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`toggle-btn ${
                    formData.surveyNumber === num ? 'selected' : ''
                  }`}
                  onClick={() => handleSurveyNumberChange(num)}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* 調査員名 */}
          <div className="form-group">
            <label className="form-label">調査員名</label>
            <select
              className="select-input"
              value={formData.investigator}
              onChange={(e) =>
                setFormData({ ...formData, investigator: e.target.value })
              }
            >
              {INVESTIGATOR_OPTIONS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* フォルダ番号 */}
          <div className="form-group">
            <label className="form-label">フォルダ番号</label>
            <div className="number-stepper">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleFolderNumberChange(-1)}
              >
                <Minus size={20} />
              </button>
              <input
                type="number"
                className="stepper-input"
                value={formData.folderNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    folderNumber: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                min="1"
              />
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleFolderNumberChange(1)}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="selected">
              <Check size={18} />
              保存して閉じる
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
