import { useState } from "react";

function App() {
  const [form, setForm] = useState({ name: "", rollno: "", address: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "rollno" ? value.replace(/\D/g, "") : value, 
    });
  };


  const handleSubmit = async () => {
    if (!form.name || !form.rollno || !form.address) {
      alert("All fields are required!");
      return;
    }

    const payload = {
      ...form,
      rollno: parseInt(form.rollno, 10), 
    };

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) alert("✅ Form submitted manually!");
      setForm({ name: "", rollno: "", address: "" });
    } catch (err) {
      console.error(err);
      alert("Error submitting form");
    } finally {
      setLoading(false);
    }
  };


  const handleTalk = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser!");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-IN";
    recognition.onresult = async (event) => {
      const speechText = event.results[0][0].transcript;
      setLoading(true);

      try {
        const res = await fetch("http://localhost:5000/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: speechText }),
        });
        const data = await res.json();

        if (data.success) {
          alert(`🤖 AI submitted form automatically!\nName: ${data.data.name}\nRoll: ${data.data.rollno}\nAddress: ${data.data.address}`);
        } else {
          console.error(data);
          alert("AI could not process input");
        }
      } catch (err) {
        console.error(err);
        alert("Error with AI submission");
      } finally {
        setLoading(false);
      }
    };

    recognition.start();
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", fontFamily: "sans-serif" }}>
      <h2>Student Form</h2>

      <input
        name="name"
        placeholder="Name"
        value={form.name}
        onChange={handleChange}
        style={{ width: "100%", padding: "8px", margin: "8px 0" }}
      />
      <input
        name="rollno"
        placeholder="Roll No"
        value={form.rollno}
        onChange={handleChange}
        style={{ width: "100%", padding: "8px", margin: "8px 0" }}
      />
      <input
        name="address"
        placeholder="Address"
        value={form.address}
        onChange={handleChange}
        style={{ width: "100%", padding: "8px", margin: "8px 0" }}
      />

      <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
        <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: "10px" }}>
          Submit Manually
        </button>
        <button onClick={handleTalk} disabled={loading} style={{ flex: 1, padding: "10px" }}>
          Talk to AI (Auto Submit)
        </button>
      </div>

      {loading && <p>⏳ Processing...</p>}
    </div>
  );
}

export default App;
