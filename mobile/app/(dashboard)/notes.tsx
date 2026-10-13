import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";

const STORAGE_KEY = "atlas_notes";

interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number;
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const loadNotes = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setNotes(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const saveNotes = async (next: Note[]) => {
    setNotes(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleSave = async () => {
    if (!title.trim() && !body.trim()) {
      setEditorOpen(false);
      return;
    }
    const note: Note = {
      id: Date.now().toString(),
      title: title.trim() || "Untitled",
      body: body.trim(),
      createdAt: Date.now(),
    };
    await saveNotes([note, ...notes]);
    setTitle("");
    setBody("");
    setEditorOpen(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete note?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void saveNotes(notes.filter((n) => n.id !== id)),
      },
    ]);
  };

  if (editorOpen) {
    return (
      <View className="flex-1 bg-background px-6 pt-14">
        <View className="flex-row items-center justify-between pb-4">
          <Text className="text-lg font-semibold text-text">New Note</Text>
          <Pressable onPress={() => setEditorOpen(false)} className="p-2">
            <MaterialIcons name="close" size={22} color="#a1a1aa" />
          </Pressable>
        </View>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor="#52525b"
          className="rounded-2xl border border-white/10 bg-surface px-4 py-3 text-lg font-semibold text-text"
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Write something..."
          placeholderTextColor="#52525b"
          multiline
          textAlignVertical="top"
          className="mt-3 flex-1 rounded-2xl border border-white/10 bg-surface px-4 py-3 text-base leading-relaxed text-text"
        />
        <Pressable
          onPress={() => void handleSave()}
          className="mb-8 mt-4 items-center rounded-2xl bg-primary py-4 active:opacity-80"
        >
          <Text className="text-base font-semibold text-white">Save Note</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background pt-14">
      <View className="flex-row items-center justify-between px-6 pb-4">
        <Text className="text-2xl font-bold text-text">Notes</Text>
        <Pressable
          onPress={() => setEditorOpen(true)}
          className="flex-row items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 active:opacity-80"
        >
          <MaterialIcons name="add" size={18} color="#fff" />
          <Text className="text-sm font-semibold text-white">New</Text>
        </Pressable>
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center pt-20">
            <MaterialIcons name="sticky-note-2" size={48} color="#27272a" />
            <Text className="mt-4 text-base text-white/50">No notes yet</Text>
            <Text className="mt-1 text-sm text-white/30">
              Tap + to create your first note
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() => handleDelete(item.id)}
            className="mb-3 rounded-2xl border border-white/10 bg-surface p-4"
          >
            <View className="flex-row items-center justify-between">
              <Text
                className="flex-1 text-base font-semibold text-text"
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Pressable onPress={() => handleDelete(item.id)} className="p-1">
                <MaterialIcons name="delete-outline" size={18} color="#52525b" />
              </Pressable>
            </View>
            {item.body ? (
              <Text
                className="mt-2 text-sm leading-relaxed text-white/50"
                numberOfLines={3}
              >
                {item.body}
              </Text>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
}
