import { useState } from "react";
import supabase from "./services/SupabaseClient";
import "./App.css";

function App() {
  const [genres, setGenres] = useState([]);
  const [inputs, setInputs] = useState({
    title: "",
    album: "Single",
    artist: "",
    genre: "",
  });

  async function signInHandler() {
    const result = await supabase.auth.signInWithOAuth({ provider: "github" });
    console.log(result);
  }

  const addGenreHandler = (e) => {
    e.preventDefault();

    const alreadyExists = genres.some((genre) => genre.title === inputs.genre);

    if (alreadyExists) return;

    const newGenre = {
      id: genres.length + 1,
      title: inputs.genre,
    };

    setGenres((prevGenres) => [...prevGenres, newGenre]);
    setInputs((prev) => {
      return {
        ...prev,
        genre: "",
      };
    });
  };

  const removeGenreHandler = (e, id) => {
    e.preventDefault();
    const newGenres = genres.filter((genre) => genre.id !== id);
    setGenres(newGenres);
  };

  return (
    <>
      <div className="h-screen bg-neutral-700 flex flex-col gap-6 justify-center items-center">
        <button className="bg-white p-4 text-lg" onClick={signInHandler}>
          sign in
        </button>

        <form action="#" className="flex flex-col gap-6">
          <input
            type="text"
            value={inputs.title}
            onChange={(e) =>
              setInputs((prevInputs) => {
                return { ...prevInputs, title: e.target.value };
              })
            }
            placeholder="title"
          />
          <input
            type="text"
            value={inputs.album}
            onChange={(e) =>
              setInputs((prevInputs) => {
                return { ...prevInputs, album: e.target.value };
              })
            }
            placeholder="album"
          />
          <input
            type="text"
            value={inputs.artist}
            onChange={(e) =>
              setInputs((prevInputs) => {
                return { ...prevInputs, artist: e.target.value };
              })
            }
            placeholder="artist"
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputs.genre}
              onChange={(e) =>
                setInputs((prevInputs) => {
                  return { ...prevInputs, genre: e.target.value };
                })
              }
              placeholder="genre"
            />
            <button className="bg-white p-2 text-lg" onClick={addGenreHandler}>
              Add
            </button>
          </div>
          <div className="flex items-center flex-wrap max-w-[600px] gap-4">
            {genres.map((genre) => (
              <Genre key={genre.id} onRemove={removeGenreHandler} {...genre} />
            ))}
          </div>
        </form>
      </div>
    </>
  );
}

function Genre({ title, onRemove, id }) {
  return (
    <div className="flex p-3 border border-white items-center gap-2">
      <span className="text-lg text-white">{title}</span>
      <button
        onClick={(e) => onRemove(e, id)}
        className="bg-white text-sm p-2 text-lg"
      >
        X
      </button>
    </div>
  );
}

export default App;
