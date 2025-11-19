import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface SphereSearchProps {
  onSearch: (filters: SearchFilters) => void;
  specializations: Array<{ id: number; name: string }>;
}

export interface SearchFilters {
  query: string;
  specializationId: number | null;
}

export const SphereSearch = ({ onSearch, specializations }: SphereSearchProps) => {
  const [query, setQuery] = useState("");
  const [specializationId, setSpecializationId] = useState<number | null>(null);

  const handleSearch = () => {
    onSearch({ query, specializationId });
  };

  const handleClear = () => {
    setQuery("");
    setSpecializationId(null);
    onSearch({ query: "", specializationId: null });
  };

  const hasFilters = query.length > 0 || specializationId !== null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o empresa..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Select
          value={specializationId?.toString() || "all"}
          onValueChange={(value) => setSpecializationId(value === "all" ? null : parseInt(value))}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Especialidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las especialidades</SelectItem>
            {specializations.map((spec) => (
              <SelectItem key={spec.id} value={spec.id.toString()}>
                {spec.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleSearch}>
          Buscar
        </Button>
      </div>

      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filtros activos:</span>
          {query && (
            <Badge variant="secondary" className="gap-1">
              Búsqueda: {query}
              <X
                className="h-3 w-3 cursor-pointer hover:opacity-70"
                onClick={() => {
                  setQuery("");
                  handleSearch();
                }}
              />
            </Badge>
          )}
          {specializationId && (
            <Badge variant="secondary" className="gap-1">
              {specializations.find(s => s.id === specializationId)?.name}
              <X
                className="h-3 w-3 cursor-pointer hover:opacity-70"
                onClick={() => {
                  setSpecializationId(null);
                  handleSearch();
                }}
              />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 text-xs"
          >
            Limpiar todo
          </Button>
        </div>
      )}
    </div>
  );
};
