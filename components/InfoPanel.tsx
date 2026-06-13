"use client";

interface InfoPanelProps {
  title: string;
  description: string;
  credit: { name: string; url: string };
  subtopics: string[];
}

export default function InfoPanel({
  title,
  description,
  credit,
  subtopics,
}: InfoPanelProps) {
  return (
    <div className="info-panel">
      <h2 className="info-panel-title">{title}</h2>
      <p className="info-panel-description">{description}</p>

      {subtopics.length > 0 && (
        <div className="info-panel-subtopics">
          {subtopics.map((topic, i) => (
            <span key={i} className="info-panel-subtopic">
              {topic}
            </span>
          ))}
        </div>
      )}

      <p className="info-panel-credit">
        Photo by{" "}
        <a href={credit.url} target="_blank" rel="noopener noreferrer">
          {credit.name}
        </a>{" "}
        on Unsplash
      </p>
    </div>
  );
}
