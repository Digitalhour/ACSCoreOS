// import React, { useState, useEffect } from 'react';
// import { Head } from '@inertiajs/react';
// import { PageProps } from '@/types';
// import axios from 'axios';
// import { toast } from 'sonner';
// import { Toaster } from '@/components/ui/sonner';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Textarea } from '@/components/ui/textarea';
// import { Checkbox } from '@/components/ui/checkbox';
// import { Label } from '@/components/ui/label';
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Badge } from '@/components/ui/badge';
// import { Skeleton } from '@/components/ui/skeleton';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
//
// interface PtoBlackout {
//   id: number;
//   name: string;
//   description: string;
//   start_date: string;
//   end_date: string;
//   position_id: number | null;
//   position?: {
//     name: string;
//   };
//   is_company_wide: boolean;
//   is_holiday: boolean;
//   is_strict: boolean;
// }
//
// interface Position {
//   id: number;
//   name: string;
// }
//
// export default function AdminPtoBlackoutsView({ auth, title }: PageProps) {
//   const [blackouts, setBlackouts] = useState<PtoBlackout[]>([]);
//   const [positions, setPositions] = useState<Position[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [showForm, setShowForm] = useState<boolean>(false);
//   const [formData, setFormData] = useState<Partial<PtoBlackout>>({
//     name: '',
//     description: '',
//     start_date: '',
//     end_date: '',
//     position_id: null,
//     is_company_wide: false,
//     is_holiday: false,
//     is_strict: false,
//   });
//   const [editingId, setEditingId] = useState<number | null>(null);
//
//   useEffect(() => {
//     fetchBlackouts();
//     fetchPositions();
//   }, []);
//
//   const fetchBlackouts = async () => {
//     setLoading(true);
//     try {
//       const response = await axios.get('/api/pto-blackouts');
//       setBlackouts(response.data);
//     } catch (error) {
//       console.error('Error fetching PTO blackouts:', error);
//       toast.error('Failed to load PTO blackouts');
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   const fetchPositions = async () => {
//     try {
//       const response = await axios.get('/api/positions');
//       setPositions(response.data);
//     } catch (error) {
//       console.error('Error fetching positions:', error);
//       toast.error('Failed to load positions');
//     }
//   };
//
//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
//     const { name, value, type } = e.target;
//
//     if (type === 'checkbox') {
//       const checked = (e.target as HTMLInputElement).checked;
//       setFormData({ ...formData, [name]: checked });
//     } else if (name === 'position_id') {
//       setFormData({ ...formData, [name]: value === '' ? null : parseInt(value) });
//     } else {
//       setFormData({ ...formData, [name]: value });
//     }
//   };
//
//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//
//     try {
//       if (editingId) {
//         await axios.put(`/api/pto-blackouts/${editingId}`, formData);
//         toast.success('Blackout period updated successfully');
//       } else {
//         await axios.post('/api/pto-blackouts', formData);
//         toast.success('Blackout period created successfully');
//       }
//
//       resetForm();
//       fetchBlackouts();
//     } catch (error) {
//       console.error('Error saving PTO blackout:', error);
//       toast.error('Failed to save PTO blackout');
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   const handleEdit = (blackout: PtoBlackout) => {
//     setFormData({
//       name: blackout.name,
//       description: blackout.description,
//       start_date: blackout.start_date,
//       end_date: blackout.end_date,
//       position_id: blackout.position_id,
//       is_company_wide: blackout.is_company_wide,
//       is_holiday: blackout.is_holiday,
//       is_strict: blackout.is_strict,
//     });
//     setEditingId(blackout.id);
//     setShowForm(true);
//   };
//
//   const handleDelete = async (id: number) => {
//     if (!confirm('Are you sure you want to delete this blackout period?')) {
//       return;
//     }
//
//     setLoading(true);
//     try {
//       await axios.delete(`/api/pto-blackouts/${id}`);
//       toast.success('Blackout period deleted successfully');
//       fetchBlackouts();
//     } catch (error) {
//       console.error('Error deleting PTO blackout:', error);
//       toast.error('Failed to delete PTO blackout');
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   const resetForm = () => {
//     setFormData({
//       name: '',
//       description: '',
//       start_date: '',
//       end_date: '',
//       position_id: null,
//       is_company_wide: false,
//       is_holiday: false,
//       is_strict: false,
//     });
//     setEditingId(null);
//     setShowForm(false);
//   };
//
//   return (
//     <>
//       <Head title={title || 'PTO Blackouts Administration'} />
//       <Toaster richColors position="top-right" />
//       <h2 className="font-semibold text-xl text-gray-800 leading-tight">{title || 'PTO Blackouts Administration'}</h2>
//
//       <div className="py-12">
//         <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
//           <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
//             <div className="p-6 text-gray-900">
//               <div className="mb-6 flex justify-between items-center">
//                 <h3 className="text-lg font-medium">Manage Blackout Periods</h3>
//                 <Button
//                   onClick={() => setShowForm(!showForm)}
//                   variant={showForm ? "outline" : "default"}
//                 >
//                   {showForm ? 'Cancel' : 'Add New Blackout Period'}
//                 </Button>
//               </div>
//
//               {showForm && (
//                 <div className="mb-8 p-4 bg-gray-50 rounded-md">
//                   <h4 className="text-md font-medium mb-4">{editingId ? 'Edit Blackout Period' : 'Add New Blackout Period'}</h4>
//                   <form onSubmit={handleSubmit}>
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
//                       <div className="space-y-2">
//                         <Label htmlFor="name">Name</Label>
//                         <Input
//                           type="text"
//                           id="name"
//                           name="name"
//                           value={formData.name}
//                           onChange={handleInputChange}
//                           required
//                         />
//                       </div>
//
//                       <div className="space-y-2">
//                         <Label htmlFor="position_id">Position</Label>
//                         <Select
//                           value={formData.position_id?.toString() || ''}
//                           onValueChange={(value) => {
//                             handleInputChange({
//                               target: {
//                                 name: 'position_id',
//                                 value: value,
//                                 type: 'select'
//                               }
//                             } as any);
//                           }}
//                           disabled={formData.is_company_wide}
//                         >
//                           <SelectTrigger id="position_id">
//                             <SelectValue placeholder="Select a position" />
//                           </SelectTrigger>
//                           <SelectContent>
//                             <SelectItem value="">None</SelectItem>
//                             {positions.map(position => (
//                               <SelectItem key={position.id} value={position.id.toString()}>{position.name}</SelectItem>
//                             ))}
//                           </SelectContent>
//                         </Select>
//                       </div>
//
//                       <div className="space-y-2">
//                         <Label htmlFor="start_date">Start Date</Label>
//                         <Input
//                           type="date"
//                           id="start_date"
//                           name="start_date"
//                           value={formData.start_date}
//                           onChange={handleInputChange}
//                           required
//                         />
//                       </div>
//
//                       <div className="space-y-2">
//                         <Label htmlFor="end_date">End Date</Label>
//                         <Input
//                           type="date"
//                           id="end_date"
//                           name="end_date"
//                           value={formData.end_date}
//                           onChange={handleInputChange}
//                           required
//                         />
//                       </div>
//
//                       <div className="md:col-span-2 space-y-2">
//                         <Label htmlFor="description">Description</Label>
//                         <Textarea
//                           id="description"
//                           name="description"
//                           value={formData.description}
//                           onChange={handleInputChange}
//                           rows={3}
//                         />
//                       </div>
//                     </div>
//
//                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
//                       <div className="flex items-center space-x-2">
//                         <Checkbox
//                           id="is_company_wide"
//                           checked={formData.is_company_wide}
//                           onCheckedChange={(checked) => {
//                             handleInputChange({
//                               target: {
//                                 name: 'is_company_wide',
//                                 checked: checked === true,
//                                 type: 'checkbox'
//                               }
//                             } as any);
//                           }}
//                         />
//                         <Label htmlFor="is_company_wide" className="text-sm">Company-wide</Label>
//                       </div>
//
//                       <div className="flex items-center space-x-2">
//                         <Checkbox
//                           id="is_holiday"
//                           checked={formData.is_holiday}
//                           onCheckedChange={(checked) => {
//                             handleInputChange({
//                               target: {
//                                 name: 'is_holiday',
//                                 checked: checked === true,
//                                 type: 'checkbox'
//                               }
//                             } as any);
//                           }}
//                         />
//                         <Label htmlFor="is_holiday" className="text-sm">Holiday</Label>
//                       </div>
//
//                       <div className="flex items-center space-x-2">
//                         <Checkbox
//                           id="is_strict"
//                           checked={formData.is_strict}
//                           onCheckedChange={(checked) => {
//                             handleInputChange({
//                               target: {
//                                 name: 'is_strict',
//                                 checked: checked === true,
//                                 type: 'checkbox'
//                               }
//                             } as any);
//                           }}
//                         />
//                         <Label htmlFor="is_strict" className="text-sm">Strict (Auto-deny PTO)</Label>
//                       </div>
//                     </div>
//
//                     <div className="flex justify-end space-x-3">
//                       <Button
//                         type="button"
//                         onClick={resetForm}
//                         variant="outline"
//                       >
//                         Cancel
//                       </Button>
//                       <Button
//                         type="submit"
//                       >
//                         {editingId ? 'Update' : 'Create'}
//                       </Button>
//                     </div>
//                   </form>
//                 </div>
//               )}
//
//               {loading && !showForm ? (
//                 <div className="py-4 flex justify-center">
//                   <Skeleton className="h-[400px] w-full" />
//                 </div>
//               ) : (
//                 <div className="rounded-md border">
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>Name</TableHead>
//                         <TableHead>Dates</TableHead>
//                         <TableHead>Position</TableHead>
//                         <TableHead>Type</TableHead>
//                         <TableHead>Actions</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {blackouts.length > 0 ? (
//                         blackouts.map((blackout) => (
//                           <TableRow key={blackout.id}>
//                             <TableCell>
//                               <div className="font-medium">{blackout.name}</div>
//                               <div className="text-sm text-muted-foreground">{blackout.description}</div>
//                             </TableCell>
//                             <TableCell>
//                               {new Date(blackout.start_date).toLocaleDateString()} - {new Date(blackout.end_date).toLocaleDateString()}
//                             </TableCell>
//                             <TableCell>
//                               {blackout.is_company_wide ? 'Company-wide' : (blackout.position?.name || 'None')}
//                             </TableCell>
//                             <TableCell>
//                               <div className="flex gap-2">
//                                 {blackout.is_holiday && (
//                                   <Badge variant="success">
//                                     Holiday
//                                   </Badge>
//                                 )}
//                                 {blackout.is_strict && (
//                                   <Badge variant="destructive">
//                                     Strict
//                                   </Badge>
//                                 )}
//                               </div>
//                             </TableCell>
//                             <TableCell>
//                               <div className="flex gap-2">
//                                 <Button
//                                   onClick={() => handleEdit(blackout)}
//                                   variant="outline"
//                                   size="sm"
//                                 >
//                                   Edit
//                                 </Button>
//                                 <Button
//                                   onClick={() => handleDelete(blackout.id)}
//                                   variant="destructive"
//                                   size="sm"
//                                 >
//                                   Delete
//                                 </Button>
//                               </div>
//                             </TableCell>
//                           </TableRow>
//                         ))
//                       ) : (
//                         <TableRow>
//                           <TableCell colSpan={5} className="text-center">
//                             No blackout periods found
//                           </TableCell>
//                         </TableRow>
//                       )}
//                     </TableBody>
//                   </Table>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }
