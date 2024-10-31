import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Upload, Download, AlertTriangle, Terminal } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const App = () => {
  const [files, setFiles] = useState([]);
  const [analysis, setAnalysis] = useState(null);

  const analyzeCSSContent = (content) => {
    // Basic CSS analysis that can run in browser
    const metrics = {
      selectors: content.match(/[^}]+{/g)?.length || 0,
      declarations: content.match(/{[^}]+}/g)?.length || 0,
      mediaQueries: content.match(/@media[^{]+{/g)?.length || 0,
      importStatements: content.match(/@import[^;]+;/g)?.length || 0,
      keyframes: content.match(/@keyframes[^}]+}/g)?.length || 0,
      colorValues: content.match(/#[a-fA-F0-9]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/g)?.length || 0,
      fontFamilies: content.match(/font-family:[^;]+;/g)?.length || 0,
    };
    
    return metrics;
  };

  const processUploadedFiles = useCallback((fileList) => {
    Promise.all(
      Array.from(fileList)
        .filter(file => file.name.endsWith('.css'))
        .map(file => new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target.result;
            resolve({
              name: file.name,
              size: (file.size / 1024).toFixed(2),
              content: content,
              metrics: analyzeCSSContent(content)
            });
          };
          reader.readAsText(file);
        }))
    ).then(newFiles => {
      setFiles(prevFiles => {
        const updatedFiles = [...prevFiles, ...newFiles];
        updateAnalysis(updatedFiles);
        return updatedFiles;
      });
    });
  }, []);

  const updateAnalysis = (currentFiles) => {
    if (currentFiles.length === 0) {
      setAnalysis(null);
      return;
    }

    const combinedMetrics = currentFiles.reduce((total, file) => ({
      selectors: (total.selectors || 0) + (file.metrics?.selectors || 0),
      declarations: (total.declarations || 0) + (file.metrics?.declarations || 0),
      mediaQueries: (total.mediaQueries || 0) + (file.metrics?.mediaQueries || 0),
      importStatements: (total.importStatements || 0) + (file.metrics?.importStatements || 0),
      keyframes: (total.keyframes || 0) + (file.metrics?.keyframes || 0),
      colorValues: (total.colorValues || 0) + (file.metrics?.colorValues || 0),
      fontFamilies: (total.fontFamilies || 0) + (file.metrics?.fontFamilies || 0),
    }), {});

    const totalSize = currentFiles.reduce((sum, file) => sum + parseFloat(file.size), 0);

    setAnalysis({
      fileCount: currentFiles.length,
      totalSize: totalSize.toFixed(2),
      ...combinedMetrics
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    processUploadedFiles(e.dataTransfer.files);
  }, [processUploadedFiles]);

  const handleFileInput = useCallback((e) => {
    processUploadedFiles(e.target.files);
  }, [processUploadedFiles]);

  const downloadMergedFile = () => {
    const merged = files.map(file => 
      `/* ${file.name} */\n${file.content}\n\n`
    ).join('');
    
    const blob = new Blob([merged], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged-styles.css';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="bg-card text-card-foreground rounded-xl border shadow w-full max-w-2xl">
      <CardHeader>
        <CardTitle>CSS File Analyzer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="warning" className="mb-4"> 
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Browser-Only Analysis</AlertTitle>
          <AlertDescription>
            This tool provides basic CSS analysis in the browser. For more detailed analysis using Wallace CLI, you'll need to download the merged file and run it locally.
          </AlertDescription>
        </Alert>

        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors"
        >
          <input
            type="file"
            onChange={handleFileInput}
            multiple
            accept=".css"
            className="hidden"
            id="file-upload"
          />
          <label 
            htmlFor="file-upload" 
            className="cursor-pointer flex flex-col items-center"
          >
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium">Drop CSS files here</p>
            <p className="text-sm text-gray-500">or click to select files</p>
          </label>
        </div>

        {analysis && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-100 rounded-md">
                <p className="text-sm text-gray-600">Files Analyzed</p>
                <p className="text-2xl font-bold">{analysis.fileCount}</p>
              </div>
              <div className="p-4 bg-gray-100 rounded-md">
                <p className="text-sm text-gray-600">Total Size</p>
                <p className="text-2xl font-bold">{analysis.totalSize} KB</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-100 rounded-md">
                <h3 className="font-semibold mb-2">Basic Metrics</h3>
                <ul className="space-y-2">
                  <li>Selectors: {analysis.selectors}</li>
                  <li>Declarations: {analysis.declarations}</li>
                  <li>Media Queries: {analysis.mediaQueries}</li>
                  <li>Import Statements: {analysis.importStatements}</li>
                  <li>Color Values: {analysis.colorValues}</li>
                  <li>Font Families: {analysis.fontFamilies}</li>
                </ul>
              </div>
              
              <div className="p-4 bg-gray-100 rounded-md">
                <h3 className="font-semibold mb-2">Actions</h3>
                <button
                  onClick={downloadMergedFile}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white w-full rounded-md hover:bg-blue-600 mb-4"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Merged CSS
                </button>
                <Alert>
              <AlertTitle className="flex items-center">
                <Terminal className="w-4 h-4 mr-2" />
                Wallace CLI Integration
              </AlertTitle>
              <AlertDescription className="space-y-2">
                <p>After downloading the merged file, run Wallace CLI:</p>
                <code className="block bg-gray-100 p-2 rounded">
                  npx wallace-cli merged-styles.css
                </code>
              </AlertDescription>
            </Alert>

                
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Analyzed Files</h3>
              <div className="space-y-2">
                {files.map((file, index) => (
                 
                  <div key={index} className="p-2 bg-gray-50 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="font-mono truncate">
                      {file.source === 'url' ? file.url : file.name}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {file.size} KB
                      </span>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {file.source === 'url' && (
                    <textarea
                      className="mt-2 w-full h-24 p-2 text-sm border rounded font-mono"
                      placeholder="Paste the CSS content here..."
                      value={file.content}
                      onChange={(e) => {
                        const updatedFiles = [...files];
                        updatedFiles[index] = {
                          ...file,
                          content: e.target.value
                        };
                        setFiles(updatedFiles);
                      }}
                    />
                  )}
                </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default App;
