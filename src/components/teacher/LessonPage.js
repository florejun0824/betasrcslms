// src/components/teacher/LessonPage.js
import React, { useState, useEffect, useRef } from 'react';
import ContentRenderer from './ContentRenderer';
// import { generateImage } from '../../services/aiService'; // REMOVE THIS LINE
import { SparklesIcon, CheckCircleIcon, ArrowUturnLeftIcon, PlusIcon, MinusIcon, TrashIcon } from '@heroicons/react/24/solid';

// A simple spinner component for the loading state
const ImageLoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center p-8 bg-slate-100 rounded-lg min-h-[300px] my-4">
    <SparklesIcon className="h-12 w-12 text-blue-500 animate-pulse" />
    <p className="mt-4 text-slate-600 font-semibold">Loading diagram...</p> {/* Changed text */}
  </div>
);

/**
 * Renders a single page of a lesson, now with a full suite of interactive editing tools
 * for finalizing diagram labels with 100% accuracy.
 */
const LessonPage = ({ page, isEditable, onFinalizeDiagram, isFinalizing }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Keep isLoading for initial image load
  const [error, setError] = useState(null);
  
  const [diagramData, setDiagramData] = useState(null);
  const [labels, setLabels] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [activeDrag, setActiveDrag] = useState(null);
  const [selectedLabelIndex, setSelectedLabelIndex] = useState(null);
  const [editingLabelIndex, setEditingLabelIndex] = useState(null);
  const imageContainerRef = useRef(null);

  useEffect(() => {
    let pageContent = page.content;
    if (page.type === 'diagram-data' && typeof page.content === 'string') {
      try {
        pageContent = JSON.parse(page.content);
      } catch (e) {
        console.error("Failed to parse diagram data:", e);
        setError("Could not load diagram data.");
        return;
      }
    }
    
    // Set image URL if available
    setImageUrl(pageContent?.generatedImageUrl || null);
    
    // If there's an image URL, we're loading it, otherwise, no image to load/generate
    setIsLoading(!!pageContent?.generatedImageUrl && !imageUrl); // Set loading if URL exists but image isn't loaded yet
    setError(null);
    setDiagramData(pageContent || null);
    
    if (isEditable) {
        setIsEditing(true);
    }
    
    if (page && page.type === 'diagram-data' && pageContent) {
      const initialLabels = (pageContent.labels || []).map((label, index) => {
        if (typeof label === 'string') {
          return { text: label, labelX: 15, labelY: 10 + (index * 8), pointX: 50, pointY: 50, fontSize: 12, isPlaced: false };
        }
        return { fontSize: 12, ...label };
      });
      setLabels(initialLabels);
      
      // REMOVE THE FOLLOWING BLOCK THAT CALLS generateImage
      // if (!pageContent.generatedImageUrl) {
      //   const fetchImage = async () => {
      //     setIsLoading(true);
      //     try {
      //       const url = await generateImage(pageContent.diagram_prompt);
      //       setImageUrl(url);
      //       if (isEditable) setIsEditing(true); 
      //     } catch (err) {
      //       setError("Sorry, the diagram could not be generated.");
      //     } finally {
      //       setIsLoading(false);
      //     }
      //   };
      //   fetchImage();
      // }
      // If there's no generatedImageUrl, and we're in diagram-data mode, 
      // it means there's no image to display, so set error.
      if (!pageContent.generatedImageUrl) {
          setError("No diagram image available for this page.");
          setIsLoading(false); // No image to load
      }
    }
  }, [page, isEditable]); // Removed imageUrl from dependency array as it can cause loop

  // Add an effect to handle when the image finishes loading from the URL
  useEffect(() => {
    if (imageUrl) {
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => setIsLoading(false);
        img.onerror = () => {
            setError("Failed to load diagram image.");
            setIsLoading(false);
        };
    }
  }, [imageUrl]);


  const handleMouseDown = (index, part) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDrag({ index, part });
    setSelectedLabelIndex(index);
  };

  const handleMouseMove = (e) => {
    if (activeDrag === null || !imageContainerRef.current) return;
    
    const { index, part } = activeDrag;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setLabels(prev => prev.map((label, i) => {
      if (i === index) {
        const newLabel = { ...label };
        if (part === 'label') {
          newLabel.labelX = x;
          newLabel.labelY = y;
        } else {
          newLabel.pointX = x;
          newLabel.pointY = y;
          newLabel.isPlaced = true;
        }
        return newLabel;
      }
      return label;
    }));
  };

  const handleMouseUp = () => setActiveDrag(null);

  const handleLabelClick = (index) => {
    if (!isEditing) return;
    setSelectedLabelIndex(index);
    setEditingLabelIndex(null);
  };

  const handleLabelDoubleClick = (index) => {
    if (!isEditing) return;
    setEditingLabelIndex(index);
  };

  const handleLabelTextChange = (e) => {
    const newText = e.target.value;
    setLabels(prev => prev.map((label, i) => i === editingLabelIndex ? { ...label, text: newText } : label));
  };

  const handleLabelTextBlur = () => {
    setEditingLabelIndex(null);
  };
  
  const handleFontSizeChange = (amount) => {
      if (selectedLabelIndex === null) return;
      setLabels(prev => prev.map((label, i) => i === selectedLabelIndex ? {...label, fontSize: Math.max(8, label.fontSize + amount)} : label));
  };

  const handleDeleteLabel = () => {
      if (selectedLabelIndex === null) return;
      setLabels(prev => prev.filter((_, i) => i !== selectedLabelIndex));
      setSelectedLabelIndex(null);
  };
  
  const handleAddLabel = () => {
    const newLabel = {
        text: 'New Label',
        labelX: 50, // Default to center
        labelY: 50,
        pointX: 50,
        pointY: 50,
        fontSize: 12,
        isPlaced: false, // Force user to place the pointer first
    };
    setLabels(prev => [...prev, newLabel]);
  };

  const handleFinalize = () => {
    setIsEditing(false);
    setSelectedLabelIndex(null);
    // When finalizing, we ensure generatedImageUrl is always the source for the diagram
    onFinalizeDiagram({ ...diagramData, labels: labels, generatedImageUrl: imageUrl });
  };
  
  const allLabelsPlaced = labels.every(l => l.isPlaced);

  if (!page || (typeof page.content !== 'string' && typeof page.content !== 'object')) return null;

  const shouldRenderTitle = page.title && page.title.trim() !== '';

  switch (page.type) {
    case 'diagram-data':
      return (
        <div className="my-6 p-4 border-2 border-dashed rounded-lg bg-slate-50 select-none">
          {shouldRenderTitle && <h4 className="text-xl font-bold text-slate-700 mb-2">{page.title}</h4>}
          
          {isEditing && (
             <div className="p-3 mb-4 text-center bg-blue-100 border-2 border-blue-200 text-blue-800 rounded-md text-sm font-medium">
                <p className="font-bold">Instructions:</p>
                <p><strong>Step 1:</strong> Drag each blue dot to a point on the diagram. <br/> <strong>Step 2:</strong> Drag the green label text to position it. Double-click to rename.</p>
             </div>
          )}

          {isLoading && <ImageLoadingSpinner />}
          {error && <div className="text-center text-red-600 p-4 bg-red-50 rounded-lg">{error}</div>}
          
          {imageUrl && diagramData && ( // Only render if imageUrl exists
            <div 
              className="relative w-full max-w-3xl mx-auto"
              ref={imageContainerRef}
              onMouseMove={isEditing ? handleMouseMove : null}
              onMouseUp={isEditing ? handleMouseUp : null}
              onMouseLeave={isEditing ? handleMouseUp : null}
            >
              <img src={imageUrl} alt={diagramData.diagram_prompt} className="w-full h-auto rounded-md shadow-md" draggable="false" />
              <svg className="absolute top-0 left-0 w-full h-full overflow-visible" style={{ pointerEvents: 'none' }}>
                {labels.map((label, index) => (
                  (label.isPlaced || !isEditing) && <g key={index}>
                    <line x1={`${label.labelX}%`} y1={`${label.labelY}%`} x2={`${label.pointX}%`} y2={`${label.pointY}%`} stroke="black" strokeWidth="2" strokeDasharray="4,3" />
                    <circle cx={`${label.pointX}%`} cy={`${label.pointY}%`} r="4" fill="red" stroke="white" strokeWidth="1" />
                  </g>
                ))}
              </svg>
              <div className="absolute top-0 left-0 w-full h-full">
                {labels.map((label, index) => (
                  <div key={index} onMouseDown={isEditing ? handleMouseDown(index, 'label') : null}
                    onClick={() => handleLabelClick(index)} onDoubleClick={() => handleLabelDoubleClick(index)}
                    className={`absolute p-1 rounded font-bold text-white shadow-lg ${isEditing ? 'cursor-move' : 'cursor-default'} ${label.isPlaced ? 'bg-green-600' : 'bg-blue-600'} ${selectedLabelIndex === index ? 'ring-2 ring-yellow-400' : ''}`}
                    style={{ left: `${label.labelX}%`, top: `${label.labelY}%`, transform: 'translate(-50%, -50%)', fontSize: `${label.fontSize}px`, pointerEvents: 'auto' }}>
                    {editingLabelIndex === index ? (
                        <input type="text" value={label.text} onChange={handleLabelTextChange} onBlur={handleLabelTextBlur} onKeyDown={e => e.key === 'Enter' && handleLabelTextBlur()} autoFocus className="bg-transparent text-white w-full outline-none border-b border-white"/>
                    ) : (
                        label.text
                    )}
                  </div>
                ))}
                {isEditing && labels.map((label, index) => (
                  !label.isPlaced && <div key={`point-${index}`}
                    className="absolute w-4 h-4 bg-blue-500 rounded-full animate-pulse cursor-move border-2 border-white"
                    style={{ left: `${label.pointX}%`, top: `${label.pointY}%`, transform: 'translate(-50%, -50%)', pointerEvents: 'auto' }}
                    onMouseDown={handleMouseDown(index, 'point')}
                  />
                ))}
              </div>
            </div>
          )}
          {isEditable && imageUrl && <div className="flex justify-center items-center flex-wrap gap-3 mt-4"> {/* Only show edit buttons if imageUrl exists */}
            {selectedLabelIndex !== null && isEditing && (
                <div className="flex items-center gap-1 p-1 bg-slate-200 rounded-lg">
                    <button onClick={() => handleFontSizeChange(-1)} className="px-2 py-1 bg-white rounded shadow hover:bg-slate-100"><MinusIcon className="h-4 w-4"/></button>
                    <span className="text-xs font-semibold w-6 text-center">{labels[selectedLabelIndex]?.fontSize}pt</span>
                    <button onClick={() => handleFontSizeChange(1)} className="px-2 py-1 bg-white rounded shadow hover:bg-slate-100"><PlusIcon className="h-4 w-4"/></button>
                    <button onClick={handleDeleteLabel} className="px-2 py-1 bg-red-500 text-white rounded shadow hover:bg-red-600 ml-2"><TrashIcon className="h-4 w-4"/></button>
                </div>
            )}
            {isEditing ? (
              <div className="flex items-center gap-3">
                <button onClick={handleAddLabel} disabled={isFinalizing} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400">
                    <PlusIcon className="h-5 w-5" /> Add Label
                </button>
                <button onClick={handleFinalize} disabled={!allLabelsPlaced || isFinalizing} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                    <CheckCircleIcon className={`h-5 w-5 ${isFinalizing ? 'animate-spin' : ''}`} /> {isFinalizing ? 'Finalizing...' : 'Finalize Diagram'}
                </button>
              </div>
            ) : (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-600">
                <ArrowUturnLeftIcon className="h-5 w-5" /> Re-edit Labels
              </button>
            )}
          </div>}
        </div>
      );

    case 'diagram':
      return (
        <div className="mb-6 last:mb-0 p-4 border rounded-lg bg-slate-50">
          {shouldRenderTitle && <h4 className="font-semibold text-gray-700 mb-3">{page.title}</h4>}
          <div className="flex justify-center items-center w-full" dangerouslySetInnerHTML={{ __html: page.content }} />
        </div>
      );

    default:
      return (
        <div className="mb-6 last:mb-0">
          {shouldRenderTitle && <h4 className="font-semibold text-gray-700 mb-2">{page.title}</h4>}
          <ContentRenderer text={page.content} />
        </div>
      );
  }
};
export default LessonPage;
