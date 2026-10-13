import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "atlas_notes";

interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number;
}

export default function NotesScreen() {
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
      <KeyboardAvoidingView
        className="flex-1 bg-background px-6 pt-12"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-bold text-text">New Note</Text>
          <Pressable onPress={() => setEditorOpen(false)}>
            <Text className="text-primary text-sm">Cancel</Text>
          </Pressable>
        </View>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor="#52525b"
          className="bg-surface border border-gray-700 rounded-xl p-4 text-lg font-semibold text-text"
        />

        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Write your note..."
          placeholderTextColor="#52525b"
          multiline
          textAlignVertical="top"
          className="bg-surface border border-gray-700 rounded-xl p-4 mt-3 text-base text-text flex-1"
        />

        <Pressable
          onPress={() => void handleSave()}
          className="bg-primary py-4 rounded-xl mt-4 mb-8 active:opacity-80"
        >
          <Text className="text-white text-center font-bold">Save Note</Text>
        </Pressable>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 mt-12 mb-4">
        <Text className="text-2xl font-bold text-text">My Notes</Text>
        <Text className="text-gray-400 text-sm">{notes.length} notes</Text>
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <Text className="text-4xl mb-4">📝</Text>
            <Text className="text-gray-400 text-center">
              No notes yet. Create one!
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() => handleDelete(item.id)}
            className="bg-surface rounded-xl p-4 mb-3 border border-gray-800"
          >
            <View className="flex-row items-center justify-between">
              <Text
                className="text-base font-semibold text-text flex-1"
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Pressable onPress={() => handleDelete(item.id)}>
                <Text className="text-gray-500 text-sm">✕</Text>
              </Pressable>
            </View>
            {item.body ? (
              <Text className="text-gray-400 mt-2 text-sm" numberOfLines={2}>
                {item.body}
              </Text>
            ) : null}
            <Text className="text-gray-500 text-xs mt-2">
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </Pressable>
        )}
      />

      {/* FAB */}
      <Pressable
        onPress={() => setEditorOpen(true)}
        className="bg-primary w-16 h-16 rounded-full items-center justify-center absolute bottom-8 right-4 shadow-lg active:opacity-80"
      >
        <Text className="text-white text-3xl font-bold">+</Text>
      </Pressable>
    </View>
  );
}
