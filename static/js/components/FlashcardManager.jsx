const FlashcardManager = () => {
  const [flashcards, setFlashcards] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    fetch('/api/flashcards')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch flashcards');
        return res.json();
      })
      .then(data => {
        setFlashcards(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading)
    return <div className="text-center py-4">Loading flashcards...</div>;
  if (error)
    return <div className="text-red-500 text-center py-4">Error: {error}</div>;

  return (
    <div className="flashcard-container">
      <h2 className="text-2xl font-bold mb-4">Flashcards</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {flashcards.map(card => (
          <div
            key={card.id}
            className="border p-4 rounded shadow hover:shadow-lg transition-shadow"
          >
            <div className="font-bold">{card.front}</div>
            <div className="mt-2">{card.back}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
