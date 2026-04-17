import PhotoThumb from './PhotoThumb';

type Photo = {
  id: string;
  url: string | null;
};

export default function PhotoGallery({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) {
    return (
      <p className="text-xs text-neutral-400 italic">Нет фото</p>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {photos.map((p) => (
        <PhotoThumb key={p.id} photoId={p.id} url={p.url} />
      ))}
    </div>
  );
}