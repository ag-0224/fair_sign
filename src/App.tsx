import { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Bell, 
  ArrowLeft, 
  LayoutDashboard, 
  Stethoscope, 
  PlusCircle, 
  FolderOpen, 
  User, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './index.css';

// Types
type Role = 'user' | 'ai';
type MessageType = 'text' | 'file' | 'analysis';

interface AnalysisData {
  score: number;
  summary: string[];
  explanation: string;
  clauses: Array<{
    title: string;
    risk: 'High' | 'Medium' | 'Low';
    description: string;
    advice: string;
  }>;
}

interface Message {
  id: string;
  role: Role;
  type: MessageType;
  content: string;
  data?: AnalysisData;
}

type Tab = 'dashboard' | 'aftercare' | 'upload' | 'storage' | 'mypage';

function App() {
  const [view, setView] = useState<'landing' | 'analysis'>('landing');
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  // Scroll to bottom when messages change
  useEffect(() => {
    if (view === 'analysis') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAnalyzing, view]);

  const startAnalysis = async (file: File) => {
    if (isAnalyzing) return; // Prevent multiple uploads during analysis

    if (!API_KEY || API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      setError("시스템 설정 오류: API 키가 설정되지 않았습니다.");
      return;
    }

    // Switch to analysis view
    setView('analysis');
    setIsAnalyzing(true);
    setError(null);

    // 1. Add User File Message
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      type: 'file',
      content: file.name
    };
    
    const userTextMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'user',
      type: 'text',
      content: "이 계약서 분석해줘"
    };

    setMessages(prev => [...prev, newUserMessage, userTextMessage]);

    // Reset file input value immediately so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const prompt = `
        You are a legal contract analysis expert. Analyze the provided contract image/document.
        Identify potential risks, unfavorable clauses for the user, and provide negotiation advice.
        
        Respond ONLY with a valid JSON object in the following format:
        {
          "score": number (0-100, higher means safer),
          "summary": ["string", "string", "string"],
          "explanation": "concise overall explanation in simple Korean",
          "clauses": [
            {
              "title": "clause title",
              "risk": "High" | "Medium" | "Low",
              "description": "why it is risky",
              "advice": "how to negotiate"
            }
          ]
        }
        
        All text fields MUST be in Korean. Keep summaries to exactly 3 points.
      `;

      const fileData = await fileToGenerativePart(file);
      const result = await model.generateContent([prompt, fileData]);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data: AnalysisData = JSON.parse(jsonMatch[0]);
        
        setMessages(prev => [
          ...prev, 
          {
            id: (Date.now() + 2).toString(),
            role: 'ai',
            type: 'text',
            content: "분석이 완료되었어요."
          },
          {
            id: (Date.now() + 3).toString(),
            role: 'ai',
            type: 'analysis',
            content: "분석 리포트",
            data: data
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      setError("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBack = () => {
    setView('landing');
    setMessages([]);
    setIsAnalyzing(false);
    setError(null);
    // Reset file input so same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise as string, mimeType: file.type },
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      startAnalysis(e.target.files[0]);
    }
  };

  const getRiskLabel = (score: number) => {
    if (score >= 80) return { label: '안전함', class: 'low' };
    if (score >= 50) return { label: '주의 요함', class: 'medium' };
    return { label: '위험 높음', class: 'high' };
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="main-header">
        {view === 'analysis' ? (
          <button className="icon-btn" onClick={handleBack}>
            <ArrowLeft size={24} />
          </button>
        ) : (
          <button className="icon-btn">
            <Menu size={24} />
          </button>
        )}
        
        <div className="header-title">
          {view === 'analysis' ? "계약서 분석" : "페어사인"}
        </div>

        <button className="icon-btn">
          <Bell size={24} />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="chat-container">
        {view === 'landing' ? (
          <div className="landing-view">
            <div className="upload-circle">
              <FileText size={48} color="var(--accent-cyan)" />
            </div>
            <div>
              <h1 className="landing-title">계약서를 올려주세요</h1>
              <p className="landing-subtitle">
                PDF, 사진 촬영(OCR)<br />
                텍스트 직접 입력 지원<br />
                <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>무료 3회</span>
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="chat-disclaimer">
              AI는 실수를 할 수 있으며, 법률 전문가의 조언을 대체할 수 없습니다.
            </div>
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                {msg.type === 'file' ? (
                  <div className="bubble" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', color: 'black' }}>
                    <div style={{ padding: '8px', background: '#f0f0f0', borderRadius: '8px' }}>
                      <FileText size={20} />
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{msg.content}</div>
                  </div>
                ) : msg.type === 'analysis' && msg.data ? (
                  <div className="analysis-card">
                    <div className="card-header">
                      <span className={`risk-level ${getRiskLabel(msg.data.score).class}`}>
                        {getRiskLabel(msg.data.score).label}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>스코어: {msg.data.score}점</span>
                    </div>
                    <div className="card-body">
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '10px' }}>핵심 요약</div>
                      <ul className="card-summary-list">
                        {msg.data.summary.map((s, i) => (
                          <li key={i} className="card-summary-item">
                            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-cyan)' }} />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="bubble">{msg.content}</div>
                )}
              </div>
            ))}
            
            {isAnalyzing && (
              <div className="message ai">
                <div className="bubble" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Loader2 size={18} className="animate-spin" />
                  계약서를 읽고 있어요...
                </div>
              </div>
            )}
            
            {error && (
              <div className="message ai">
                <div className="bubble" style={{ border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)' }}>
                  <AlertTriangle size={18} style={{ display: 'inline', marginRight: '8px' }} />
                  {error}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </>
        )}
      </main>

      {/* Action Area (Only visible in landing view, or modified for analysis view) */}
      <div className={`bottom-actions ${isAnalyzing ? 'disabled' : ''}`}>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          style={{ display: 'none' }}
          accept="image/*,.pdf"
          disabled={isAnalyzing}
        />
        <div 
          className="action-bar" 
          onClick={() => !isAnalyzing && fileInputRef.current?.click()}
        >
          {isAnalyzing ? "분석 중입니다..." : (view === 'landing' ? "파일 업로드 / 사진 촬영 / TEXT 작성" : "다른 계약서 분석하기")}
        </div>
      </div>

      {/* Tab Bar */}
      <nav className="tab-bar">
        <div className="tab-item disabled">
          <LayoutDashboard className="tab-icon" />
          <span>대시보드</span>
        </div>
        <div className="tab-item disabled">
          <Stethoscope className="tab-icon" />
          <span>사후 처방</span>
        </div>
        <div className={`tab-item ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>
          <PlusCircle className="tab-icon" style={{ width: '32px', height: '32px' }} />
          <span>계약서 업로드</span>
        </div>
        <div className="tab-item disabled">
          <FolderOpen className="tab-icon" />
          <span>보관함</span>
        </div>
        <div className="tab-item disabled">
          <User className="tab-icon" />
          <span>마이페이지</span>
        </div>
      </nav>
    </div>
  );
}

export default App;
